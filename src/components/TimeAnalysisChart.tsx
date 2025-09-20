import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";

interface TimeAnalysisData {
  statusTimeData: Array<{
    name: string;
    avgDays: number;
    leadCount: number;
    color: string;
  }>;
  conversionDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  criticalLeads: Array<{
    id: string | number;
    name: string;
    statusName: string;
    daysInStatus: number;
    value: number;
  }>;
}

interface TimeAnalysisChartProps {
  data: TimeAnalysisData | null;
  loading?: boolean;
}

export const TimeAnalysisChart = ({ data, loading = false }: TimeAnalysisChartProps) => {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <div className="w-48 h-6 bg-muted animate-pulse rounded" />
            <div className="w-64 h-4 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDays = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)}h`;
    if (days < 7) return `${Math.round(days)}d`;
    return `${Math.round(days / 7)}sem`;
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de Tempo por Status */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle>Tempo Médio por Estágio</CardTitle>
          <CardDescription>
            Análise detalhada do tempo gasto em cada etapa do pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.statusTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickFormatter={(value) => formatDays(value)}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))"
                  }}
                  formatter={(value: number, name) => [
                    `${formatDays(value)} (${name === 'avgDays' ? 'Tempo médio' : name})`,
                    'Tempo médio'
                  ]}
                  labelFormatter={(label) => `Estágio: ${label}`}
                />
                <Bar 
                  dataKey="avgDays" 
                  radius={[4, 4, 0, 0]}
                >
                  {data.statusTimeData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de Conversões e Leads Críticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Tempo de Conversão */}
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Conversões</CardTitle>
            <CardDescription>
              Tempo necessário para fechamento dos leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.conversionDistribution.map((range, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{range.range}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${range.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12">
                      {range.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leads Críticos */}
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Leads Críticos</CardTitle>
            </div>
            <CardDescription>
              Leads há muito tempo no mesmo estágio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.criticalLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum lead crítico identificado
                </p>
              ) : (
                data.criticalLeads.map((lead, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={lead.name}>
                        {lead.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.statusName}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDays(lead.daysInStatus)}
                      </Badge>
                      <span className="text-xs font-medium">
                        R$ {lead.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};