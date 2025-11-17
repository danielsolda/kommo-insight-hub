import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ParsedSpreadsheet, detectCustomFields } from "@/utils/spreadsheetParser";
import { useComparisonAnalytics } from "@/hooks/useComparisonAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CustomFieldsComparisonProps {
  spreadsheetA: ParsedSpreadsheet | null;
  spreadsheetB: ParsedSpreadsheet | null;
}

export const CustomFieldsComparison = ({ spreadsheetA, spreadsheetB }: CustomFieldsComparisonProps) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

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

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const getChartData = (fieldName: string) => {
    if (!spreadsheetA || !spreadsheetB) return [];

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from(selectedFields).map((field) => {
            const chartData = getChartData(field);
            if (chartData.length === 0) return null;

            return (
              <Card key={field}>
                <CardHeader>
                  <CardTitle className="text-base">{field}</CardTitle>
                  <CardDescription>Distribuição entre períodos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="name"
                          className="text-xs"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey={spreadsheetA.name}
                          fill="hsl(var(--primary))"
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
};
