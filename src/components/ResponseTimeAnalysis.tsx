import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { useResponseTimeAnalysis } from "@/hooks/useResponseTimeAnalysis";
import { Lead, Event, User } from "@/services/kommoApi";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

interface ResponseTimeAnalysisProps {
  leads: Lead[];
  events: Event[];
  users: User[];
  loading: boolean;
}

export const ResponseTimeAnalysis = ({ leads, events, users, loading }: ResponseTimeAnalysisProps) => {
  const { responseMetricsByUser, overallMetrics, leadsWithResponseTime } = useResponseTimeAnalysis(
    leads,
    events,
    users
  );

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days}d ${remainingHours}h`;
    }
  };

  const getResponseTimeBadge = (hours: number) => {
    if (hours === 0) return <Badge variant="outline">Sem resposta</Badge>;
    if (hours < 2) return <Badge className="bg-green-500">Rápido</Badge>;
    if (hours < 12) return <Badge className="bg-yellow-500">Moderado</Badge>;
    return <Badge className="bg-red-500">Lento</Badge>;
  };

  const getBarColor = (hours: number) => {
    if (hours < 2) return "hsl(var(--chart-2))"; // Verde
    if (hours < 12) return "hsl(var(--chart-3))"; // Amarelo
    return "hsl(var(--chart-1))"; // Vermelho
  };

  const sortedMetrics = [...responseMetricsByUser].sort(
    (a, b) => a.averageResponseTime - b.averageResponseTime
  );

  const chartData = sortedMetrics.map(m => ({
    name: m.userName.split(' ')[0],
    tempo: parseFloat(m.averageResponseTime.toFixed(1)),
    color: getBarColor(m.averageResponseTime)
  }));

  const leadsWithoutResponse = leadsWithResponseTime.filter(l => !l.hasResponse);
  const criticalLeads = leadsWithoutResponse.filter(l => {
    const hoursSinceCreation = (Date.now() / 1000 - l.createdAt) / 3600;
    return hoursSinceCreation > 24;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <ChartSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (responseMetricsByUser.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum dado de tempo de resposta disponível</p>
            <p className="text-sm mt-1">As interações dos vendedores aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {formatTime(overallMetrics.avgResponseTime)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">
                {overallMetrics.responseRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leads Respondidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">
                {overallMetrics.totalLeadsWithResponse}/{overallMetrics.totalLeadsAnalyzed}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leads Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold">
                {criticalLeads.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sem resposta há +24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras */}
      <Card>
        <CardHeader>
          <CardTitle>Tempo Médio de Resposta por Vendedor</CardTitle>
          <CardDescription>Comparação do tempo até primeira interação (em horas)</CardDescription>
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
                label={{ value: 'Horas', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                        <p className="font-semibold">{payload[0].payload.name}</p>
                        <p className="text-sm">
                          Tempo médio: <span className="font-bold">{formatTime(payload[0].value as number)}</span>
                        </p>
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

      {/* Tabela de Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Vendedores</CardTitle>
          <CardDescription>Desempenho detalhado de tempo de resposta</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Tempo Médio</TableHead>
                <TableHead>Mais Rápido</TableHead>
                <TableHead>Mais Lento</TableHead>
                <TableHead>Taxa de Resposta</TableHead>
                <TableHead>Respondidos/Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetrics.map((metric, index) => (
                <TableRow key={metric.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">#{index + 1}</span>
                      {index === 0 && <span className="text-xl">🥇</span>}
                      {index === 1 && <span className="text-xl">🥈</span>}
                      {index === 2 && <span className="text-xl">🥉</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{metric.userName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getResponseTimeBadge(metric.averageResponseTime)}
                      <span className="text-sm">{formatTime(metric.averageResponseTime)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTime(metric.fastestResponse)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTime(metric.slowestResponse)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={metric.responseRate > 80 ? "default" : "outline"}>
                      {metric.responseRate.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {metric.totalLeadsResponded}/{metric.totalLeadsResponded + metric.leadsWithoutResponse}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Leads Sem Resposta */}
      {criticalLeads.length > 0 && (
        <Card className="border-red-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Leads Críticos sem Resposta
            </CardTitle>
            <CardDescription>Leads aguardando primeira interação há mais de 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tempo de Espera</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalLeads.slice(0, 10).map(lead => {
                  const user = users.find(u => u.id === lead.responsibleUserId);
                  const hoursSinceCreation = (Date.now() / 1000 - lead.createdAt) / 3600;
                  
                  return (
                    <TableRow key={lead.leadId}>
                      <TableCell className="font-medium">{lead.leadName}</TableCell>
                      <TableCell>{user?.name || 'Desconhecido'}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {formatTime(hoursSinceCreation)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {criticalLeads.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                +{criticalLeads.length - 10} leads críticos adicionais
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
