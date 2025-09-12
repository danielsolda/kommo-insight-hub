import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const pipelineData = [
  { name: "Prospecção", leads: 156, value: 234000 },
  { name: "Qualificação", leads: 98, value: 187000 },
  { name: "Proposta", leads: 45, value: 156000 },
  { name: "Negociação", leads: 23, value: 89000 },
  { name: "Fechamento", leads: 12, value: 67000 },
];

const pieData = [
  { name: "Prospecção", value: 156, color: "#8b5cf6" },
  { name: "Qualificação", value: 98, color: "#a78bfa" },
  { name: "Proposta", value: 45, color: "#c4b5fd" },
  { name: "Negociação", value: 23, color: "#ddd6fe" },
  { name: "Fechamento", value: 12, color: "#ede9fe" },
];

export const PipelineChart = () => {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <CardTitle>Pipeline de Vendas</CardTitle>
        <CardDescription>
          Distribuição de leads por estágio do pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
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

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))"
                  }}
                  formatter={(value) => [`${value} leads`, 'Quantidade']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          {pipelineData.map((stage, index) => (
            <div key={index} className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">{stage.name}</div>
              <div className="text-lg font-bold">{stage.leads}</div>
              <div className="text-xs text-muted-foreground">
                R$ {(stage.value / 1000).toFixed(0)}k
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};