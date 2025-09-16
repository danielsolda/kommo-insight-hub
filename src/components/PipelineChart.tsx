import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, Target } from "lucide-react";
import { useState } from "react";

interface PipelineStats {
  pipelineId: number;
  pipelineName: string;
  statuses: Array<{
    id: number;
    name: string;
    count: number;
    value: number;
    color: string;
  }>;
}

interface PipelineChartProps {
  pipelineStats?: PipelineStats;
  loading?: boolean;
}

export const PipelineChart = ({ pipelineStats, loading = false }: PipelineChartProps) => {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
          <CardDescription>
            Carregando dados do pipeline...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pipelineStats || !pipelineStats.statuses.length) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
          <CardDescription>
            Selecione um pipeline para visualizar os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <Target className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum dado disponível para este pipeline</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const pipelineData = pipelineStats.statuses.map(status => ({
    name: status.name,
    leads: status.count,
    value: status.value,
  }));

  const pieData = pipelineStats.statuses.map(status => ({
    name: status.name,
    value: status.count,
    color: status.color,
  }));

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <CardTitle>{pipelineStats.pipelineName}</CardTitle>
        <CardDescription>
          Distribuição de leads por estágio do pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))"
                  }}
                  formatter={(value, name) => [
                    name === 'leads' ? `${value} leads` : `R$ ${value.toLocaleString()}`,
                    name === 'leads' ? 'Leads' : 'Valor'
                  ]}
                />
                <Bar 
                  dataKey="leads" 
                  fill="url(#gradientBar)" 
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary-glow))" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            <div className="w-full h-[300px] relative overflow-visible">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={hoveredSegment !== null ? 85 : 80}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                    onMouseEnter={(_, index) => setHoveredSegment(index)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease-in-out',
                      transformOrigin: 'center',
                    }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{
                          filter: hoveredSegment === index ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                          transition: 'all 0.3s ease-in-out',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                    formatter={(value) => [`${value} leads`, 'Quantidade']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pipelineData.map((stage, index) => (
            <div key={index} className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground truncate" title={stage.name}>
                {stage.name}
              </div>
              <div className="text-lg font-bold">{stage.leads}</div>
              <div className="text-xs text-muted-foreground">
                R$ {stage.value > 1000 ? (stage.value / 1000).toFixed(0) + 'k' : stage.value.toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};