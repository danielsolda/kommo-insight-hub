import { useMemo, forwardRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, CustomField } from '@/services/kommoApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklyMetricsConfig } from './WeeklyMetricsConfig';

interface WeeklyTrendChartProps {
  leads: Lead[];
  config: WeeklyMetricsConfig;
  numberOfWeeks?: number;
}

const getWeekRange = (weeksAgo: number = 0): { start: Date; end: Date } => {
  const today = new Date();
  const currentWeekStart = startOfWeek(subWeeks(today, weeksAgo), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  return { start: currentWeekStart, end: currentWeekEnd };
};

const isLeadInWeek = (lead: Lead, start: Date, end: Date): boolean => {
  const leadDate = new Date(lead.created_at * 1000);
  return isWithinInterval(leadDate, { start, end });
};

const hasCustomFieldValue = (lead: Lead, fieldId: number, targetValues: string[]): boolean => {
  if (!lead.custom_fields_values || !fieldId || targetValues.length === 0) return false;
  
  const field = lead.custom_fields_values.find((f: CustomField) => f.field_id === fieldId);
  if (!field || !field.values || field.values.length === 0) return false;
  
  const fieldValue = field.values[0]?.value;
  if (!fieldValue) return false;
  
  return targetValues.some(val => 
    fieldValue.toString().toLowerCase().includes(val.toLowerCase())
  );
};

const hasStatus = (lead: Lead, statusIds: number[]): boolean => {
  return statusIds.includes(lead.status_id);
};

export const WeeklyTrendChart = forwardRef<HTMLDivElement, WeeklyTrendChartProps>(
  ({ leads, config, numberOfWeeks = 4 }, ref) => {
    const chartData = useMemo(() => {
      const data = [];
      
      for (let i = numberOfWeeks - 1; i >= 0; i--) {
        const range = getWeekRange(i);
        const weekLeads = leads.filter(lead => isLeadInWeek(lead, range.start, range.end));
        
        const total = weekLeads.length;
        
        const traffic = config.trafficField.fieldId
          ? weekLeads.filter(lead => 
              hasCustomFieldValue(lead, config.trafficField.fieldId!, config.trafficField.values)
            ).length
          : 0;
        
        const appointments = weekLeads.filter(lead => 
          hasStatus(lead, config.appointmentStatusIds)
        ).length;
        
        const attendances = weekLeads.filter(lead => 
          hasStatus(lead, config.attendanceStatusIds)
        ).length;
        
        const closures = weekLeads.filter(lead => 
          hasStatus(lead, config.closedWonStatusIds)
        ).length;
        
        data.push({
          week: `${format(range.start, 'dd/MM', { locale: ptBR })} - ${format(range.end, 'dd/MM', { locale: ptBR })}`,
          Total: total,
          Tráfego: traffic,
          Agendamentos: appointments,
          Comparecimentos: attendances,
          Fechamentos: closures,
        });
      }
      
      return data;
    }, [leads, config, numberOfWeeks]);

    return (
      <Card ref={ref} className="bg-background border-border">
        <CardHeader>
          <CardTitle>Tendência das Últimas {numberOfWeeks} Semanas</CardTitle>
          <CardDescription>
            Evolução das métricas principais ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="week" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="Total" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line 
                type="monotone" 
                dataKey="Tráfego" 
                stroke="hsl(217, 91%, 60%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(217, 91%, 60%)' }}
              />
              <Line 
                type="monotone" 
                dataKey="Agendamentos" 
                stroke="hsl(142, 71%, 45%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(142, 71%, 45%)' }}
              />
              <Line 
                type="monotone" 
                dataKey="Comparecimentos" 
                stroke="hsl(262, 83%, 58%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(262, 83%, 58%)' }}
              />
              <Line 
                type="monotone" 
                dataKey="Fechamentos" 
                stroke="hsl(47, 96%, 53%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(47, 96%, 53%)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }
);

WeeklyTrendChart.displayName = 'WeeklyTrendChart';
