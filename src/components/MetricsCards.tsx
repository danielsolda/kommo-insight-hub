import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Phone } from "lucide-react";

interface GeneralStats {
  totalRevenue: number;
  activeLeads: number;
  conversionRate: number;
  totalCalls: number;
  revenueChange: string;
  leadsChange: string;
  conversionChange: string;
  callsChange: string;
}

interface MetricsCardsProps {
  generalStats?: GeneralStats | null;
  loading?: boolean;
}

export const MetricsCards = ({ generalStats, loading }: MetricsCardsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const metrics = [
    {
      title: "Receita Fechada",
      value: loading ? "..." : generalStats ? formatCurrency(generalStats.totalRevenue) : "R$ 0",
      change: generalStats?.revenueChange || "+0%",
      trend: generalStats?.revenueChange?.startsWith('+') ? "up" : "down",
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Leads em Andamento",
      value: loading ? "..." : generalStats ? generalStats.activeLeads.toString() : "0",
      change: generalStats?.leadsChange || "+0%",
      trend: generalStats?.leadsChange?.startsWith('+') ? "up" : "down", 
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10"
    },
    {
      title: "Taxa de Fechamento",
      value: loading ? "..." : generalStats ? `${generalStats.conversionRate.toFixed(1)}%` : "0%",
      change: generalStats?.conversionChange || "+0%",
      trend: generalStats?.conversionChange?.startsWith('+') ? "up" : "down",
      icon: Target,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      title: "Atividades",
      value: "N/A",
      change: "N/A",
      trend: "neutral",
      icon: Phone,
      color: "text-primary-glow",
      bgColor: "bg-primary/10"
    }
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="bg-gradient-card border-border/50 shadow-card hover:shadow-elegant transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{metric.value}</div>
              <div className="flex items-center text-xs">
                {metric.trend === "neutral" ? (
                  <span className="h-3 w-3 mr-1" /> // Empty space for neutral
                ) : metric.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                )}
                <span className={
                  metric.trend === "neutral" ? "text-muted-foreground" :
                  metric.trend === "up" ? "text-success" : "text-destructive"
                }>
                  {metric.change}
                </span>
                <span className="text-muted-foreground ml-1">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};