import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Loader2 } from "lucide-react";

interface SalesData {
  month: string;
  vendas: number;
  meta: number;
  leads: number;
}

interface SalesChartProps {
  salesData?: SalesData[];
  loading?: boolean;
}

export const SalesChart = ({ salesData = [], loading = false }: SalesChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalSales = salesData.reduce((sum, data) => sum + data.vendas, 0);
  const totalTarget = salesData.reduce((sum, data) => sum + data.meta, 0);
  const totalLeads = salesData.reduce((sum, data) => sum + data.leads, 0);
  const targetAchievement = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;
  const remainingTarget = Math.max(0, totalTarget - totalSales);
  const conversionRate = totalLeads > 0 ? (totalLeads * 0.235) : 0; // Estimated conversion
  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <CardTitle>Evolução de Vendas</CardTitle>
        <CardDescription>
          Acompanhe o desempenho de vendas ao longo do ano
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando dados de vendas...</span>
          </div>
        ) : salesData.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Nenhum dado de vendas disponível</span>
          </div>
        ) : (
          <>
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
                <div className="text-xl font-bold text-success">{formatCurrency(totalSales)}</div>
                <div className="text-xs text-muted-foreground">Baseado em leads fechados</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Meta Atingida</div>
                <div className="text-xl font-bold text-warning">{targetAchievement.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(remainingTarget)} restante</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Leads Convertidos</div>
                <div className="text-xl font-bold text-info">{Math.floor(conversionRate)}</div>
                <div className="text-xs text-muted-foreground">Taxa de conversão estimada</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};