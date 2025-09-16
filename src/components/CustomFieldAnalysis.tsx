import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface CustomFieldAnalysisProps {
  customFields: any[];
  allLeads: any[];
  pipelines: any[];
  loading: boolean;
}

export const CustomFieldAnalysis = ({ customFields, allLeads, pipelines, loading }: CustomFieldAnalysisProps) => {
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all");

  // Filter custom fields to show only useful ones (non-tracking, non-predefined)
  const usefulFields = customFields.filter(field => 
    !field.is_predefined && 
    field.type !== 'tracking_data' && 
    ['text', 'textarea', 'select', 'multiselect', 'numeric'].includes(field.type)
  );

  // Process data for analysis
  const getAnalysisData = () => {
    if (!selectedField || !allLeads.length) return [];

    const field = usefulFields.find(f => f.id.toString() === selectedField);
    if (!field) return [];

    // Filter leads by pipeline if selected
    const filteredLeads = selectedPipeline === "all" 
      ? allLeads 
      : allLeads.filter(lead => lead.pipeline_id?.toString() === selectedPipeline);

    // Group leads by custom field value and status
    const groupedData: { [key: string]: { [status: string]: number } } = {};
    const statusNames = new Set<string>();

    filteredLeads.forEach(lead => {
      // Get custom field value
      const customFieldValue = lead.custom_fields_values?.find((cfv: any) => 
        Number(cfv.field_id) === Number(field.id)
      );
      
      let fieldValue = "Não preenchido";
      if (customFieldValue && customFieldValue.values && customFieldValue.values.length > 0) {
        if (field.type === 'multiselect' || field.type === 'select') {
          fieldValue = customFieldValue.values.map((v: any) => {
            // If it has a direct value, use it
            if (v.value) return v.value;
            
            // If it has enum_id, map it to the label
            if (v.enum_id && field.enums) {
              const enumItem = field.enums.find((e: any) => Number(e.id) === Number(v.enum_id));
              return enumItem?.value || `enum:${v.enum_id}`;
            }
            
            // Fallback to whatever value exists
            return v || "Não preenchido";
          }).join(', ');
        } else {
          const value = customFieldValue.values[0];
          fieldValue = value?.value || value || "Não preenchido";
        }
      }

      // Get status name
      const statusName = lead.status_name || "Status desconhecido";
      statusNames.add(statusName);

      if (!groupedData[fieldValue]) {
        groupedData[fieldValue] = {};
      }
      
      groupedData[fieldValue][statusName] = (groupedData[fieldValue][statusName] || 0) + 1;
    });

    // Convert to chart data
    return Object.entries(groupedData).map(([fieldValue, statuses]) => {
      const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);
      return {
        fieldValue: fieldValue.length > 20 ? fieldValue.substring(0, 20) + "..." : fieldValue,
        fullValue: fieldValue,
        total,
        ...statuses
      };
    }).sort((a, b) => b.total - a.total);
  };

  const analysisData = getAnalysisData();

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Análise de Campos Personalizados
          </CardTitle>
          <CardDescription>
            Carregando dados...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Análise de Campos Personalizados
        </CardTitle>
        <CardDescription>
          Analise a distribuição de valores dos campos personalizados por status de pipeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Campo Personalizado</label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um campo personalizado" />
              </SelectTrigger>
              <SelectContent>
                {usefulFields.map(field => (
                  <SelectItem key={field.id} value={field.id.toString()}>
                    {field.name} ({field.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Pipeline</label>
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Pipelines</SelectItem>
                {pipelines.map(pipeline => (
                  <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Analysis Results */}
        {selectedField && analysisData.length > 0 ? (
          <div className="space-y-6">
            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="fieldValue" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--foreground))" fontSize={12} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.fullValue}</p>
                            <p className="text-sm text-muted-foreground">Total: {data.total} leads</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Valor do Campo</TableHead>
                    <TableHead>Total de Leads</TableHead>
                    <TableHead>% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisData.slice(0, 10).map((item, index) => {
                    const totalLeads = analysisData.reduce((sum, d) => sum + d.total, 0);
                    const percentage = ((item.total / totalLeads) * 100).toFixed(1);
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.fullValue}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.total}
                          </Badge>
                        </TableCell>
                        <TableCell>{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : selectedField ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum dado encontrado para este campo personalizado.</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Selecione um campo personalizado para visualizar a análise.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};