import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, AlertTriangle, Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface ConversionTimeData {
  averageConversionTime: number; // em dias
  averageTimePerStatus: { statusName: string; avgDays: number; color: string }[];
  conversionRate: number;
  stuckLeads: number; // leads há mais de X dias no mesmo status
  totalLeads: number;
  fastestConversion: number;
  slowestConversion: number;
}

interface ConversionMetricsProps {
  data: ConversionTimeData | null;
  loading?: boolean;
}

export const ConversionMetrics = ({ data, loading = false }: ConversionMetricsProps) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-gradient-card border-border/50 shadow-card">
            <CardHeader className="pb-3">
              <div className="w-8 h-8 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-8 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatDays = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)}h`;
    if (days < 7) return `${Math.round(days)}d`;
    return `${Math.round(days / 7)}sem`;
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Tempo Médio de Conversão */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatDays(data.averageConversionTime)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Conversão completa
          </p>
        </CardContent>
      </Card>

      {/* Taxa de Conclusão */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Percentual de leads que finalizaram o processo (ganhos + perdidos) em relação ao total de leads</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {data.conversionRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Leads finalizados
          </p>
        </CardContent>
      </Card>

      {/* Leads Presos */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-sm font-medium">Leads Presos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {data.stuckLeads}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Há mais de 30 dias
          </p>
        </CardContent>
      </Card>

      {/* Total Pipeline */}
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {data.totalLeads}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Leads ativos
          </p>
        </CardContent>
      </Card>

      {/* Status com Maior Tempo */}
      <Card className="bg-gradient-card border-border/50 shadow-card col-span-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tempo Médio por Estágio</CardTitle>
          <CardDescription>
            Identificação de gargalos no processo de vendas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.averageTimePerStatus.map((status, index) => (
              <Badge
                key={index}
                variant="outline"
                className="px-3 py-1 text-xs"
                style={{ 
                  borderColor: status.color + '40',
                  backgroundColor: status.color + '10'
                }}
              >
                <span className="font-medium">{status.statusName}</span>
                <span className="ml-2 text-muted-foreground">
                  {formatDays(status.avgDays)}
                </span>
              </Badge>
            ))}
          </div>
          
          {data.averageTimePerStatus.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Conversão mais rápida: {formatDays(data.fastestConversion)}
              </span>
              <span>
                Conversão mais lenta: {formatDays(data.slowestConversion)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
};