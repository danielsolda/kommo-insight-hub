import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock, CheckCircle, TrendingUp, AlertTriangle, Timer, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useResponseTimeData, UserResponseMetrics } from "@/hooks/useResponseTimeData";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { BusinessHoursConfigModal, loadBusinessHoursConfig } from "@/components/BusinessHoursConfigModal";
import { User } from "@/services/kommoApi";

interface ResponseTimeDashboardProps {
  users: User[];
  loading: boolean;
}

const formatMinutes = (minutes: number): string => {
  if (minutes < 1) return "<1min";
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return `${hours}h ${mins}min`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

const getBarColor = (minutes: number, slaMinutes: number) => {
  if (minutes <= slaMinutes) return "hsl(var(--chart-2))";
  if (minutes <= slaMinutes * 3) return "hsl(var(--chart-3))";
  return "hsl(var(--chart-1))";
};

const getSlaStatusBadge = (slaRate: number) => {
  if (slaRate >= 80) return <Badge className="bg-green-500 text-white">Excelente</Badge>;
  if (slaRate >= 50) return <Badge className="bg-yellow-500 text-white">Moderado</Badge>;
  return <Badge className="bg-red-500 text-white">Crítico</Badge>;
};

export const ResponseTimeDashboard = ({ users, loading: parentLoading }: ResponseTimeDashboardProps) => {
  const { data, loading, fetchResponseTime } = useResponseTimeData();
  const [refreshKey, setRefreshKey] = useState(0);

  const doFetch = useCallback(() => {
    if (users.length > 0) {
      fetchResponseTime(users);
    }
  }, [users, fetchResponseTime]);

  useEffect(() => {
    if (users.length > 0 && !data && !loading) {
      doFetch();
    }
  }, [users, data, loading, doFetch]);

  useEffect(() => {
    if (refreshKey > 0) {
      doFetch();
    }
  }, [refreshKey, doFetch]);

  const handleConfigChanged = () => {
    setRefreshKey(k => k + 1);
  };

  if (parentLoading || loading) {
    return (
      <div className="space-y-4">
        <ChartSkeleton title="Tempo de Resposta" />
        <TableSkeleton />
      </div>
    );
  }

  if (!data || data.userMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum dado de tempo de resposta disponível</p>
            <p className="text-sm mt-1">Dados de mensagens recebidas/enviadas aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { overall, userMetrics, slaMinutes } = data;

  const sortedMetrics = [...userMetrics].sort((a, b) => a.avgResponseMinutes - b.avgResponseMinutes);

  const chartData = sortedMetrics.map(m => ({
    name: m.responsibleUserName.split(' ')[0],
    tempo: m.avgResponseMinutes,
    mediana: m.medianResponseMinutes,
    color: getBarColor(m.avgResponseMinutes, slaMinutes)
  }));

  const bhConfig = loadBusinessHoursConfig();

  return (
    <div className="space-y-6">
      {/* Config Button */}
      <div className="flex justify-end">
        <BusinessHoursConfigModal onConfigChanged={handleConfigChanged} />
      </div>

      {/* Summary Cards */}
      <TooltipProvider delayDuration={200}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Tempo Médio
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p className="font-semibold mb-1">Como é calculado:</p>
                    <p>Soma de todos os tempos de resposta dividida pelo número total de pareamentos. Cada pareamento é o intervalo entre uma mensagem recebida do cliente e a primeira resposta enviada pelo vendedor no mesmo lead.</p>
                    <p className="mt-1 text-muted-foreground">Fonte: eventos de chat da API Kommo (incoming → outgoing), filtrados por horário comercial.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{formatMinutes(overall.avgResponseMinutes)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Média geral de resposta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Mediana
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p className="font-semibold mb-1">Como é calculado:</p>
                    <p>Ordena todos os tempos de resposta do menor ao maior e pega o valor do meio. Diferente da média, não é afetada por valores extremos (ex: uma resposta de 24h não distorce o resultado).</p>
                    <p className="mt-1 text-muted-foreground">Representa o tempo "típico" de resposta da equipe.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{formatMinutes(overall.medianResponseMinutes)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Valor central das respostas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Taxa SLA ({slaMinutes}min)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p className="font-semibold mb-1">Como é calculado:</p>
                    <p>Percentual de respostas que foram enviadas dentro do prazo de SLA ({slaMinutes} minutos). Fórmula: (respostas dentro do SLA ÷ total de pareamentos) × 100.</p>
                    <p className="mt-1 text-muted-foreground">Exemplo: {overall.withinSla} de {overall.totalPairs} respostas foram dadas em até {slaMinutes} min. O SLA pode ser ajustado em "Configurar Período".</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{overall.slaRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {overall.withinSla}/{overall.totalPairs} dentro do SLA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                P90
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    <p className="font-semibold mb-1">Como é calculado:</p>
                    <p>Percentil 90: ordena todos os tempos de resposta e pega o valor na posição 90%. Significa que 90% das respostas foram dadas em até esse tempo.</p>
                    <p className="mt-1 text-muted-foreground">Útil para identificar o "pior cenário comum" — os 10% restantes são outliers extremos.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-2xl font-bold">{formatMinutes(overall.p90ResponseMinutes)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">90% respondem em até</p>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tempo Médio de Resposta por Vendedor</CardTitle>
          <CardDescription>
            Baseado no pareamento de mensagens recebidas e enviadas (em minutos). SLA: {slaMinutes}min
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))' }}
                label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const entry = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                        <p className="font-semibold">{entry.name}</p>
                        <p className="text-sm">Média: <span className="font-bold">{formatMinutes(entry.tempo)}</span></p>
                        <p className="text-sm">Mediana: <span className="font-bold">{formatMinutes(entry.mediana)}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="tempo" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Seller Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Vendedores por Tempo de Resposta</CardTitle>
          <CardDescription>
            Métricas detalhadas de velocidade de resposta (últimos 30 dias)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Média</TableHead>
                <TableHead>Mediana</TableHead>
                <TableHead>P90</TableHead>
                <TableHead>SLA ({slaMinutes}min)</TableHead>
                <TableHead>Mensagens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetrics.map((metric, index) => (
                <TableRow key={metric.responsibleUserId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">#{index + 1}</span>
                      {index === 0 && <span className="text-xl">🥇</span>}
                      {index === 1 && <span className="text-xl">🥈</span>}
                      {index === 2 && <span className="text-xl">🥉</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{metric.responsibleUserName}</TableCell>
                  <TableCell>{formatMinutes(metric.avgResponseMinutes)}</TableCell>
                  <TableCell>{formatMinutes(metric.medianResponseMinutes)}</TableCell>
                  <TableCell>{formatMinutes(metric.p90ResponseMinutes)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSlaStatusBadge(metric.slaRate)}
                      <span className="text-sm">{metric.slaRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{metric.totalMessages}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Methodology Card */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Como o tempo de resposta é calculado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Buscamos eventos de <strong>mensagem recebida</strong> (incoming) e <strong>mensagem enviada</strong> (outgoing) da API do Kommo</p>
          <p>• Para cada mensagem recebida de um cliente, encontramos a próxima resposta enviada no mesmo lead</p>
          <p>• O tempo de resposta é a diferença em minutos entre os dois eventos</p>
          <p>• Filtramos por horário comercial (<strong>{bhConfig.startHour}:00–{bhConfig.endHour}:00</strong>, fuso America/São_Paulo) — mensagens fora do horário são ajustadas</p>
          <p>• O SLA configurado é de <strong>{slaMinutes} minutos</strong></p>
        </CardContent>
      </Card>
    </div>
  );
};
