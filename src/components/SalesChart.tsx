import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const salesData = [
  { month: "Jan", vendas: 45000, meta: 50000, leads: 120 },
  { month: "Fev", vendas: 52000, meta: 55000, leads: 135 },
  { month: "Mar", vendas: 48000, meta: 52000, leads: 128 },
  { month: "Abr", vendas: 61000, meta: 58000, leads: 142 },
  { month: "Mai", vendas: 55000, meta: 60000, leads: 156 },
  { month: "Jun", vendas: 67000, meta: 65000, leads: 168 },
  { month: "Jul", vendas: 73000, meta: 70000, leads: 175 },
  { month: "Ago", vendas: 69000, meta: 72000, leads: 162 },
  { month: "Set", vendas: 78000, meta: 75000, leads: 180 },
  { month: "Out", vendas: 82000, meta: 80000, leads: 195 },
  { month: "Nov", vendas: 85000, meta: 85000, leads: 210 },
  { month: "Dez", vendas: 92000, meta: 90000, leads: 225 },
];

export const SalesChart = () => {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <CardTitle>Evolução de Vendas</CardTitle>
        <CardDescription>
          Acompanhe o desempenho de vendas ao longo do ano
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))"
                }}
                formatter={(value, name) => [
                  name === 'leads' ? `${value} leads` : `R$ ${value.toLocaleString()}`,
                  name === 'vendas' ? 'Vendas' : name === 'meta' ? 'Meta' : 'Leads'
                ]}
              />
              <Area
                type="monotone"
                dataKey="vendas"
                stroke="hsl(var(--primary-glow))"
                fill="url(#gradientVendas)"
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="meta"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <defs>
                <linearGradient id="gradientVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary-glow))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">Vendas Totais</div>
            <div className="text-xl font-bold text-success">R$ 787k</div>
            <div className="text-xs text-muted-foreground">+18% vs ano anterior</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">Meta Atingida</div>
            <div className="text-xl font-bold text-warning">94.2%</div>
            <div className="text-xs text-muted-foreground">R$ 46k restante</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-muted-foreground">Leads Convertidos</div>
            <div className="text-xl font-bold text-info">1.956</div>
            <div className="text-xs text-muted-foreground">23.5% taxa conversão</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};