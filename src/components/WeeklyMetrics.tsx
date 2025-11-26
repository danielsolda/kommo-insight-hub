import { useMemo, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, TrendingUp, TrendingDown, Minus, Download, ChevronDown, ChevronUp, Users, Target, CheckCircle, UserCheck, DollarSign } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Lead } from "@/services/kommoApi";
import type { WeeklyMetricsConfig } from "./WeeklyMetricsConfig";
import { WeeklyTrendChart } from "./WeeklyTrendChart";
import { exportWeeklyMetricsToPDF } from "@/utils/weeklyPdfExporter";

interface WeeklyMetricsProps {
  leads: Lead[];
  config: WeeklyMetricsConfig | null;
  onConfigClick: () => void;
}

interface WeeklyData {
  total: number;
  traffic: number;
  appointments: number;
  attendances: number;
  closures: number;
}

const getWeekRange = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  return { start, end };
};

const isLeadInWeek = (lead: Lead, start: Date, end: Date) => {
  const createdAt = lead.created_at ? new Date(lead.created_at * 1000) : null;
  if (!createdAt) return false;
  return createdAt >= start && createdAt <= end;
};

export const WeeklyMetrics = ({ leads, config, onConfigClick }: WeeklyMetricsProps) => {
  const [showTrendChart, setShowTrendChart] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const metrics = useMemo(() => {
    const now = new Date();
    const currentWeek = getWeekRange(now);
    const previousWeek = getWeekRange(subWeeks(now, 1));

    const calculateWeekData = (start: Date, end: Date): WeeklyData => {
      const weekLeads = leads.filter(lead => isLeadInWeek(lead, start, end));

      const traffic = config?.trafficField.fieldId
        ? weekLeads.filter(lead => {
            const customFields = lead.custom_fields_values || [];
            const field = customFields.find(f => f.field_id === config.trafficField.fieldId);
            if (!field) return false;
            
            const fieldValue = field.values?.[0]?.value || field.values?.[0]?.enum_code || "";
            return config.trafficField.values.some(v => 
              String(fieldValue).toLowerCase().includes(v.toLowerCase())
            );
          }).length
        : 0;

      const appointments = config?.appointmentStatusIds.length
        ? weekLeads.filter(lead => 
            config.appointmentStatusIds.includes(lead.status_id)
          ).length
        : 0;

      const attendances = config?.attendanceStatusIds.length
        ? weekLeads.filter(lead => 
            config.attendanceStatusIds.includes(lead.status_id)
          ).length
        : 0;

      const closures = config?.closedWonStatusIds.length
        ? weekLeads.filter(lead => 
            config.closedWonStatusIds.includes(lead.status_id)
          ).length
        : 0;

      return {
        total: weekLeads.length,
        traffic,
        appointments,
        attendances,
        closures
      };
    };

    const current = calculateWeekData(currentWeek.start, currentWeek.end);
    const previous = calculateWeekData(previousWeek.start, previousWeek.end);

    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      current,
      previous,
      changes: {
        total: calculateChange(current.total, previous.total),
        traffic: calculateChange(current.traffic, previous.traffic),
        appointments: calculateChange(current.appointments, previous.appointments),
        attendances: calculateChange(current.attendances, previous.attendances),
        closures: calculateChange(current.closures, previous.closures)
      },
      weekRange: {
        start: currentWeek.start,
        end: currentWeek.end
      }
    };
  }, [leads, config]);

  const handleExportPdf = async () => {
    if (!config) {
      toast.error("Configure o resumo semanal antes de exportar");
      return;
    }

    setIsExporting(true);
    try {
      await exportWeeklyMetricsToPDF({
        leads,
        config,
        numberOfWeeks: 4,
        chartRef: chartRef.current,
      });
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const MetricCard = ({
    icon, 
    label, 
    value, 
    change, 
    previousValue,
    iconColor,
    iconBg
  }: { 
    icon: React.ComponentType<any>; 
    label: string; 
    value: number; 
    change: number;
    previousValue: number;
    iconColor: string;
    iconBg: string;
  }) => {
    const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
    const trendColor = change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground";
    const Icon = icon;

    return (
      <Card className="bg-gradient-card border-border/50 shadow-card hover:shadow-elegant transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${iconBg}`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mb-1">{value}</p>
            <div className={`text-xs ${trendColor} flex items-center gap-1`}>
              <span className="font-medium">{change > 0 ? '+' : ''}{change}%</span>
              <span className="text-muted-foreground">vs {previousValue}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!config || !config.trafficField.fieldId) {
    return (
      <Card className="mb-6 border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Configure o resumo semanal para visualizar suas métricas principais
          </p>
          <Button onClick={onConfigClick} variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Configurar Resumo Semanal
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-gradient-card border-border/50 shadow-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              📅 Resumo Semanal
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {format(metrics.weekRange.start, "dd/MM", { locale: ptBR })} - {format(metrics.weekRange.end, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowTrendChart(!showTrendChart)} 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              title="Mostrar/ocultar gráfico de tendência"
            >
              {showTrendChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={handleExportPdf} 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              disabled={isExporting}
              title="Exportar para PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              onClick={onConfigClick} 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              title="Configurar métricas"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            icon={Users}
            label="Total de Leads"
            value={metrics.current.total}
            change={metrics.changes.total}
            previousValue={metrics.previous.total}
            iconColor="text-info"
            iconBg="bg-info/10"
          />
          <MetricCard
            icon={Target}
            label="Leads de Tráfego"
            value={metrics.current.traffic}
            change={metrics.changes.traffic}
            previousValue={metrics.previous.traffic}
            iconColor="text-primary-glow"
            iconBg="bg-primary/10"
          />
          <MetricCard
            icon={CheckCircle}
            label="Agendamentos"
            value={metrics.current.appointments}
            change={metrics.changes.appointments}
            previousValue={metrics.previous.appointments}
            iconColor="text-warning"
            iconBg="bg-warning/10"
          />
          <MetricCard
            icon={UserCheck}
            label="Comparecimentos"
            value={metrics.current.attendances}
            change={metrics.changes.attendances}
            previousValue={metrics.previous.attendances}
            iconColor="text-success"
            iconBg="bg-success/10"
          />
          <MetricCard
            icon={DollarSign}
            label="Fechamentos"
            value={metrics.current.closures}
            change={metrics.changes.closures}
            previousValue={metrics.previous.closures}
            iconColor="text-success-light"
            iconBg="bg-success/10"
          />
        </div>

        {showTrendChart && config && (
          <div className="mt-6">
            <WeeklyTrendChart
              ref={chartRef}
              leads={leads}
              config={config}
              numberOfWeeks={4}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
