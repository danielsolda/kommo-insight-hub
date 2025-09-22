import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, GitCompare, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useMemo } from "react";

interface SalesData {
  month: string;
  vendas: number;
  meta: number;
  leads: number;
  yearMonth?: string;
  vendasComparacao?: number;
  metaComparacao?: number;
  leadsComparacao?: number;
}

interface SalesChartProps {
  salesData?: SalesData[];
  loading?: boolean;
  pipelineName?: string;
  wonLeadsCount?: number;
  onPeriodChange?: (period: { start: string; end: string }) => void;
  onComparisonToggle?: (enabled: boolean) => void;
  onComparisonPeriodChange?: (period: { start: string; end: string }) => void;
  comparisonMode?: boolean;
  currentPeriod?: { start: string; end: string };
  comparisonPeriod?: { start: string; end: string };
}

export const SalesChart = ({ 
  salesData = [], 
  loading = false, 
  pipelineName, 
  wonLeadsCount = 0,
  onPeriodChange,
  onComparisonToggle,
  onComparisonPeriodChange,
  comparisonMode = false,
  currentPeriod,
  comparisonPeriod
}: SalesChartProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState("6m");
  
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
  
  // Calculate target achievement for current month instead of total period
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  // Create current month key in format "YYYY-MM" 
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  // Find current month data by matching the yearMonth key
  const currentMonthData = salesData.find(data => data.yearMonth === currentMonthKey);
  
  console.log('📊 SalesChart Monthly Target Calculation:');
  console.log(`   📅 Current Month Key: ${currentMonthKey}`);
  console.log(`   📊 Current Month Data:`, currentMonthData);
  console.log(`   📈 Available Data:`, salesData.map(d => ({ month: d.month, yearMonth: d.yearMonth, meta: d.meta, vendas: d.vendas })));
  
  // Use current month data if available, otherwise use 0
  const monthlyTarget = currentMonthData?.meta || 0;
  const monthlySales = currentMonthData?.vendas || 0;
  const targetAchievement = monthlyTarget > 0 ? (monthlySales / monthlyTarget) * 100 : 0;
  const remainingTarget = Math.max(0, monthlyTarget - monthlySales);
  const actualWonLeads = wonLeadsCount || 0;

  // Comparison calculations
  const comparisonSales = useMemo(() => {
    if (!comparisonMode) return 0;
    return salesData.reduce((sum, data) => sum + (data.vendasComparacao || 0), 0);
  }, [salesData, comparisonMode]);

  const comparisonLeads = useMemo(() => {
    if (!comparisonMode) return 0;
    return salesData.reduce((sum, data) => sum + (data.leadsComparacao || 0), 0);
  }, [salesData, comparisonMode]);

  const salesVariation = useMemo(() => {
    if (!comparisonMode || comparisonSales === 0) return 0;
    return ((totalSales - comparisonSales) / comparisonSales) * 100;
  }, [totalSales, comparisonSales, comparisonMode]);

  const leadsVariation = useMemo(() => {
    if (!comparisonMode || comparisonLeads === 0) return 0;
    return ((actualWonLeads - comparisonLeads) / comparisonLeads) * 100;
  }, [actualWonLeads, comparisonLeads, comparisonMode]);

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    const now = new Date();
    let start: Date;
    
    switch (value) {
      case "3m":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "6m":
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case "12m":
        start = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }
    
    onPeriodChange?.({
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    });
  };

  const toggleComparison = () => {
    const newMode = !comparisonMode;
    onComparisonToggle?.(newMode);
    
    if (newMode && currentPeriod) {
      // Auto-suggest previous year period
      const startDate = new Date(currentPeriod.start);
      const endDate = new Date(currentPeriod.end);
      const compStart = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate());
      const compEnd = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
      
      onComparisonPeriodChange?.({
        start: compStart.toISOString().split('T')[0],
        end: compEnd.toISOString().split('T')[0]
      });
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div>
            <CardTitle>Evolução de Vendas</CardTitle>
            <CardDescription>
              {pipelineName 
                ? `Vendas fechadas da pipeline: ${pipelineName}` 
                : "Acompanhe o desempenho de vendas ao longo do ano"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={comparisonMode ? "default" : "outline"}
              size="sm"
              onClick={toggleComparison}
              className="gap-2"
            >
              <GitCompare className="h-4 w-4" />
              Comparar
            </Button>
          </div>
        </div>
        {comparisonMode && currentPeriod && comparisonPeriod && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-primary/10">
              Atual: {new Date(currentPeriod.start).toLocaleDateString('pt-BR')} - {new Date(currentPeriod.end).toLocaleDateString('pt-BR')}
            </Badge>
            <Badge variant="outline" className="bg-success-light/10">
              Comparação: {new Date(comparisonPeriod.start).toLocaleDateString('pt-BR')} - {new Date(comparisonPeriod.end).toLocaleDateString('pt-BR')}
            </Badge>
          </div>
        )}
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
                    formatter={(value, name) => {
                      if (name === 'leads' || name === 'leadsComparacao') {
                        return [`${value} leads`, name === 'leads' ? 'Leads (Atual)' : 'Leads (Comparação)'];
                      }
                      if (name === 'vendasComparacao') {
                        return [`R$ ${value.toLocaleString()}`, 'Vendas (Comparação)'];
                      }
                      if (name === 'vendas') {
                        return [`R$ ${value.toLocaleString()}`, 'Vendas (Atual)'];
                      }
                      if (name === 'meta') {
                        return [`R$ ${value.toLocaleString()}`, 'Meta'];
                      }
                      return [`R$ ${value.toLocaleString()}`, name];
                    }}
                  />
                  
                  {/* Current period sales */}
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="hsl(var(--primary-glow))"
                    fill="url(#gradientVendas)"
                    strokeWidth={3}
                    name="vendas"
                  />
                  
                  {/* Comparison period sales */}
                  {comparisonMode && (
                    <Area
                      type="monotone"
                      dataKey="vendasComparacao"
                      stroke="hsl(var(--success-light))"
                      fill="url(#gradientComparacao)"
                      strokeWidth={2}
                      name="vendasComparacao"
                    />
                  )}
                  
                  {/* Target line */}
                  <Line
                    type="monotone"
                    dataKey="meta"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="meta"
                  />
                  
                  <defs>
                    <linearGradient id="gradientVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary-glow))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="gradientComparacao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success-light))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Vendas Totais</div>
                <div className="text-xl font-bold text-success">{formatCurrency(totalSales)}</div>
                {comparisonMode && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {salesVariation > 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className={`text-xs font-medium ${salesVariation > 0 ? 'text-success' : 'text-destructive'}`}>
                      {Math.abs(salesVariation).toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {comparisonMode ? `vs ${formatCurrency(comparisonSales)}` : 'Baseado em leads fechados'}
                </div>
              </div>
              
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Meta Mensal</div>
                  <div className="text-xl font-bold text-warning">{targetAchievement.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(remainingTarget)} restante</div>
                </div>
              
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Leads Convertidos</div>
                <div className="text-xl font-bold text-info">{actualWonLeads}</div>
                {comparisonMode && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {leadsVariation > 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className={`text-xs font-medium ${leadsVariation > 0 ? 'text-success' : 'text-destructive'}`}>
                      {Math.abs(leadsVariation).toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {comparisonMode ? `vs ${comparisonLeads} leads` : 'Status 142 - Venda ganha'}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};