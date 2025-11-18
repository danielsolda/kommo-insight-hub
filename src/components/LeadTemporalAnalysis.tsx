import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState, useMemo } from "react";
import { Clock } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface Lead {
  id: number;
  name: string;
  created_at: number;
  [key: string]: any;
}

interface LeadTemporalAnalysisProps {
  leads: Lead[];
  loading?: boolean;
}

type AnalysisType = "hour" | "weekday" | "monthday" | "month";

export const LeadTemporalAnalysis = ({ leads, loading }: LeadTemporalAnalysisProps) => {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("hour");

  const chartData = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const distribution: { [key: string]: number } = {};

    leads.forEach((lead) => {
      if (!lead.created_at) return;
      
      const date = new Date(lead.created_at * 1000);
      let key: string;
      
      switch (analysisType) {
        case "hour":
          const hour = date.getHours();
          key = `${hour}:00`;
          break;
        case "weekday":
          const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
          key = weekdays[date.getDay()];
          break;
        case "monthday":
          key = `Dia ${date.getDate()}`;
          break;
        case "month":
          const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
          key = months[date.getMonth()];
          break;
        default:
          key = "Desconhecido";
      }

      distribution[key] = (distribution[key] || 0) + 1;
    });

    // Convert to array and sort appropriately
    let entries = Object.entries(distribution);
    
    if (analysisType === "hour") {
      entries.sort((a, b) => {
        const hourA = parseInt(a[0].split(":")[0]);
        const hourB = parseInt(b[0].split(":")[0]);
        return hourA - hourB;
      });
    } else if (analysisType === "weekday") {
      const weekdayOrder = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      entries.sort((a, b) => weekdayOrder.indexOf(a[0]) - weekdayOrder.indexOf(b[0]));
    } else if (analysisType === "monthday") {
      entries.sort((a, b) => {
        const dayA = parseInt(a[0].replace("Dia ", ""));
        const dayB = parseInt(b[0].replace("Dia ", ""));
        return dayA - dayB;
      });
    } else if (analysisType === "month") {
      const monthOrder = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      entries.sort((a, b) => monthOrder.indexOf(a[0]) - monthOrder.indexOf(b[0]));
    }

    return entries.map(([name, count]) => ({
      name,
      quantidade: count,
    }));
  }, [leads, analysisType]);

  const getAnalysisTitle = () => {
    switch (analysisType) {
      case "hour":
        return "Por Hora do Dia";
      case "weekday":
        return "Por Dia da Semana";
      case "monthday":
        return "Por Dia do Mês";
      case "month":
        return "Por Mês";
      default:
        return "Análise Temporal";
    }
  };

  const chartConfig = {
    quantidade: {
      label: "Leads",
      color: "hsl(var(--chart-1))",
    },
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Análise Temporal de Leads
          </CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Análise Temporal de Leads
            </CardTitle>
            <CardDescription>
              Distribuição de chegada de leads ao longo do tempo
            </CardDescription>
          </div>
          <Select value={analysisType} onValueChange={(value) => setAnalysisType(value as AnalysisType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Por Hora do Dia</SelectItem>
              <SelectItem value="weekday">Por Dia da Semana</SelectItem>
              <SelectItem value="monthday">Por Dia do Mês</SelectItem>
              <SelectItem value="month">Por Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-foreground">{getAnalysisTitle()}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Total de {leads.length} leads no período filtrado
              </p>
            </div>
            <ChartContainer config={chartConfig} className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                    angle={analysisType === "hour" ? -45 : 0}
                    textAnchor={analysisType === "hour" ? "end" : "middle"}
                    height={analysisType === "hour" ? 80 : 60}
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="quantidade" 
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]}
                    name="Quantidade de Leads"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};
