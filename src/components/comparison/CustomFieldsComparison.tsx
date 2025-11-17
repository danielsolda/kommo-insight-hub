import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParsedSpreadsheet, detectCustomFields, getFieldValues, detectFieldType } from "@/utils/spreadsheetParser";
import { useComparisonAnalytics } from "@/hooks/useComparisonAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CustomFieldsComparisonProps {
  spreadsheetA: ParsedSpreadsheet | null;
  spreadsheetB: ParsedSpreadsheet | null;
}

export const CustomFieldsComparison = ({ spreadsheetA, spreadsheetB }: CustomFieldsComparisonProps) => {
  const [selectedField, setSelectedField] = useState<string>("");

  const customFields = useMemo(() => {
    if (!spreadsheetA || !spreadsheetB) return [];
    return detectCustomFields([spreadsheetA, spreadsheetB]);
  }, [spreadsheetA, spreadsheetB]);

  const { getFieldComparison } = useComparisonAnalytics(spreadsheetA, spreadsheetB);

  const chartData = useMemo(() => {
    if (!selectedField || !spreadsheetA || !spreadsheetB) return [];

    const comparison = getFieldComparison(selectedField);
    if (!comparison) return [];

    const { distA, distB } = comparison;
    const allKeys = new Set([...Object.keys(distA), ...Object.keys(distB)]);

    return Array.from(allKeys).map((key) => ({
      name: key,
      [spreadsheetA.name]: distA[key] || 0,
      [spreadsheetB.name]: distB[key] || 0,
    }));
  }, [selectedField, spreadsheetA, spreadsheetB, getFieldComparison]);

  if (!spreadsheetA || !spreadsheetB) {
    return null;
  }

  if (customFields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Campos Personalizados</CardTitle>
          <CardDescription>Nenhum campo personalizado detectado nas planilhas</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Campos Personalizados</CardTitle>
        <CardDescription>Compare a distribuição de valores entre os períodos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedField} onValueChange={setSelectedField}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um campo para analisar" />
          </SelectTrigger>
          <SelectContent>
            {customFields.map((field) => (
              <SelectItem key={field} value={field}>
                {field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedField && chartData.length > 0 && (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={100}
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
                  fill="hsl(var(--secondary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
