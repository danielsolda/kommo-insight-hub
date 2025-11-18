import { useState, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ParsedSpreadsheet, detectCustomFields } from "@/utils/spreadsheetParser";
import { useComparisonAnalytics } from "@/hooks/useComparisonAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CustomFieldsComparisonProps {
  spreadsheetA: ParsedSpreadsheet | null;
  spreadsheetB: ParsedSpreadsheet | null;
}

export interface CustomFieldsComparisonRef {
  getChartRefs: () => Map<string, HTMLElement | null>;
  getSelectedFields: () => string[];
}

export const CustomFieldsComparison = forwardRef<CustomFieldsComparisonRef, CustomFieldsComparisonProps>(
  ({ spreadsheetA, spreadsheetB }, ref) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [timeAnalysisType, setTimeAnalysisType] = useState<'hour' | 'dayOfWeek' | 'dayOfMonth' | 'month'>('hour');
  const chartRefs = useRef<Map<string, HTMLElement | null>>(new Map());

  const allColumns = useMemo(() => {
    if (!spreadsheetA || !spreadsheetB) return [];
    const columnsSet = new Set<string>();
    spreadsheetA.columns.forEach(col => columnsSet.add(col));
    spreadsheetB.columns.forEach(col => columnsSet.add(col));
    return Array.from(columnsSet).sort();
  }, [spreadsheetA, spreadsheetB]);

  const customFields = useMemo(() => {
    if (!spreadsheetA || !spreadsheetB) return [];
    return detectCustomFields([spreadsheetA, spreadsheetB]);
  }, [spreadsheetA, spreadsheetB]);

  const { getFieldComparison } = useComparisonAnalytics(spreadsheetA, spreadsheetB);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getChartRefs: () => chartRefs.current,
    getSelectedFields: () => Array.from(selectedFields),
  }));

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const isDateField = (fieldName: string) => {
    const dateLikeNames = ['created_at', 'data_criada', 'date', 'data', 'created', 'timestamp', 'criado_em'];
    return dateLikeNames.some(name => fieldName.toLowerCase().includes(name));
  };

  const getTemporalDistribution = (spreadsheet: ParsedSpreadsheet, fieldName: string, type: string) => {
    const dist: Record<string, number> = {};
    
    spreadsheet.data.forEach(row => {
      const value = row[fieldName];
      if (!value) return;
      
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return;
        
        let key: string;
        switch (type) {
          case 'hour':
            key = `${date.getHours()}h`;
            break;
          case 'dayOfWeek':
            const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            key = days[date.getDay()];
            break;
          case 'dayOfMonth':
            key = `Dia ${date.getDate()}`;
            break;
          case 'month':
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            key = months[date.getMonth()];
            break;
          default:
            key = value;
        }
        
        dist[key] = (dist[key] || 0) + 1;
      } catch (e) {
        // Skip invalid dates
      }
    });
    
    return dist;
  };

  const getChartData = (fieldName: string) => {
    if (!spreadsheetA || !spreadsheetB) return [];

    const isDate = isDateField(fieldName);
    
    if (isDate) {
      const distA = getTemporalDistribution(spreadsheetA, fieldName, timeAnalysisType);
      const distB = getTemporalDistribution(spreadsheetB, fieldName, timeAnalysisType);
      
      const allValues = new Set([...Object.keys(distA), ...Object.keys(distB)]);
      
      const data = Array.from(allValues).map(value => ({
        name: value,
        [spreadsheetA.name]: distA[value] || 0,
        [spreadsheetB.name]: distB[value] || 0,
      }));

      // Sort based on analysis type
      if (timeAnalysisType === 'hour') {
        return data.sort((a, b) => parseInt(a.name) - parseInt(b.name));
      } else if (timeAnalysisType === 'dayOfWeek') {
        const dayOrder = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return data.sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name));
      } else if (timeAnalysisType === 'dayOfMonth') {
        return data.sort((a, b) => parseInt(a.name.replace('Dia ', '')) - parseInt(b.name.replace('Dia ', '')));
      } else if (timeAnalysisType === 'month') {
        const monthOrder = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return data.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
      }
      
      return data;
    }

    // For non-date fields, use original logic
    const comparison = getFieldComparison(fieldName);
    if (!comparison) return [];

    const { distA, distB } = comparison;
    const allKeys = new Set([...Object.keys(distA), ...Object.keys(distB)]);

    return Array.from(allKeys).slice(0, 10).map((key) => ({
      name: String(key).length > 20 ? String(key).substring(0, 20) + '...' : key,
      [spreadsheetA.name]: distA[key] || 0,
      [spreadsheetB.name]: distB[key] || 0,
    }));
  };

  if (!spreadsheetA || !spreadsheetB) {
    return null;
  }

  if (allColumns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Campos</CardTitle>
          <CardDescription>Nenhuma coluna detectada nas planilhas</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seleção de Campos para Análise</CardTitle>
          <CardDescription>Escolha as colunas que deseja comparar entre os períodos</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-4">
              {customFields.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 text-foreground">Campos Personalizados</h4>
                  <div className="space-y-2">
                    {customFields.map((field) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={`custom-${field}`}
                          checked={selectedFields.has(field)}
                          onCheckedChange={() => toggleField(field)}
                        />
                        <Label
                          htmlFor={`custom-${field}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {field}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold text-sm mb-3 text-foreground">Todas as Colunas</h4>
                <div className="space-y-2">
                  {allColumns.map((field) => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${field}`}
                        checked={selectedFields.has(field)}
                        onCheckedChange={() => toggleField(field)}
                      />
                      <Label
                        htmlFor={`col-${field}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {field}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedFields.size > 0 && (
        <div className="grid gap-6 mt-6">
          {Array.from(selectedFields).map((field) => {
            const chartData = getChartData(field);
            const isDate = isDateField(field);
            if (chartData.length === 0) return null;

            return (
              <Card key={field}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-lg">{field}</CardTitle>
                      <CardDescription>
                        {isDate ? 'Análise temporal' : 'Distribuição entre períodos'}
                      </CardDescription>
                    </div>
                    {isDate && (
                      <Select value={timeAnalysisType} onValueChange={(value: any) => setTimeAnalysisType(value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hour">Por Hora do Dia</SelectItem>
                          <SelectItem value="dayOfWeek">Por Dia da Semana</SelectItem>
                          <SelectItem value="dayOfMonth">Por Dia do Mês</SelectItem>
                          <SelectItem value="month">Por Mês</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    ref={(el) => chartRefs.current.set(field, el)}
                    className="h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="name"
                          className="text-xs fill-muted-foreground"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis className="text-xs fill-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                            color: "hsl(var(--card-foreground))"
                          }}
                        />
                        <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                        <Bar
                          dataKey={spreadsheetA.name}
                          fill="hsl(var(--chart-1))"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey={spreadsheetB.name}
                          fill="hsl(var(--chart-2))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
});

CustomFieldsComparison.displayName = 'CustomFieldsComparison';
