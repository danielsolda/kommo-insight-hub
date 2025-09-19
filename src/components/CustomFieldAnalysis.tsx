import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface CustomFieldAnalysisProps {
  customFields: any[];
  allLeads: any[];
  pipelines: any[];
  loading: boolean;
}

export const CustomFieldAnalysis = ({ customFields, allLeads, pipelines, loading }: CustomFieldAnalysisProps) => {
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  // Reset status when pipeline changes
  useEffect(() => {
    setSelectedStatus("all");
  }, [selectedPipeline]);

  // Get available statuses from selected pipeline
  const getAvailableStatuses = () => {
    if (selectedPipeline === "all") return [];
    
    const pipeline = pipelines.find(p => p.id.toString() === selectedPipeline);
    return pipeline?.statuses || [];
  };

  // Color palette for field values - Purple and Blue tones
  const getFieldColor = (value: string, index: number) => {
    const colors = [
      "hsl(270, 70%, 60%)",  // Roxo claro
      "hsl(250, 80%, 65%)",  // Azul violeta
      "hsl(280, 75%, 55%)",  // Roxo médio
      "hsl(240, 85%, 60%)",  // Azul royal
      "hsl(290, 70%, 50%)",  // Roxo escuro
      "hsl(220, 90%, 55%)",  // Azul profundo
      "hsl(260, 80%, 65%)",  // Violeta
      "hsl(210, 75%, 60%)",  // Azul acinzentado
      "hsl(300, 70%, 60%)",  // Roxo rosado
      "hsl(200, 80%, 55%)"   // Azul ciano
    ];
    return colors[index % colors.length];
  };

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
    let filteredLeads = selectedPipeline === "all" 
      ? allLeads 
      : allLeads.filter(lead => lead.pipeline_id?.toString() === selectedPipeline);

    // Filter leads by status if selected
    if (selectedStatus !== "all") {
      filteredLeads = filteredLeads.filter(lead => lead.status_id?.toString() === selectedStatus);
    }

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
    const chartData = Object.entries(groupedData).map(([fieldValue, statuses]) => {
      const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);
      return {
        fieldValue: fieldValue.length > 20 ? fieldValue.substring(0, 20) + "..." : fieldValue,
        fullValue: fieldValue,
        total,
        ...statuses
      };
    }).sort((a, b) => b.total - a.total);

    // Add colors and percentages for pie chart
    const totalLeads = chartData.reduce((sum, item) => sum + item.total, 0);
    return chartData.map((item, index) => ({
      ...item,
      fillColor: getFieldColor(item.fullValue, index),
      percentage: totalLeads > 0 ? ((item.total / totalLeads) * 100).toFixed(1) : "0"
    }));
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
          Analise a distribuição de valores dos campos personalizados por pipeline e status específico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select 
              value={selectedStatus} 
              onValueChange={setSelectedStatus}
              disabled={selectedPipeline === "all"}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedPipeline === "all" ? "Selecione uma pipeline primeiro" : "Todos os status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {getAvailableStatuses().map(status => (
                  <SelectItem key={status.id} value={status.id.toString()}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart Type Toggle */}
        {selectedField && analysisData.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button
              variant={chartType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("bar")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Barras
            </Button>
            <Button
              variant={chartType === "pie" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("pie")}
              className="gap-2"
            >
              <PieChartIcon className="h-4 w-4" />
              Pizza
            </Button>
          </div>
        )}

        {/* Analysis Results */}
        {selectedField && analysisData.length > 0 ? (
          <div className="space-y-6">
            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
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
                              <p className="text-sm text-muted-foreground">{data.percentage}% do total</p>
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
                ) : (
                  <PieChart>
                    <Pie
                      data={analysisData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ total }) => total}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {analysisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fillColor} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-medium">{data.fullValue}</p>
                              <p className="text-sm text-muted-foreground">Total: {data.total} leads</p>
                              <p className="text-sm text-muted-foreground">{data.percentage}% do total</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      content={() => (
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                          {analysisData.slice(0, 8).map((entry, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs">
                              <div 
                                className="w-3 h-3 rounded" 
                                style={{ backgroundColor: entry.fillColor }}
                              />
                              <span className="text-muted-foreground">
                                {entry.fieldValue}: {entry.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </PieChart>
                )}
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