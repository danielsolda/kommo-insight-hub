import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Tag, BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface TagsComparatorProps {
  tags: any[];
  allLeads: any[];
  pipelines: any[];
  loading: boolean;
}

export const TagsComparator = ({ tags, allLeads, pipelines, loading }: TagsComparatorProps) => {
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all");
  const [chartType, setChartType] = useState<"bar" | "pie">("pie");
  const [showUntagged, setShowUntagged] = useState<boolean>(true);

  // Color palette for pie chart
  const getTagColor = (color: string | null, index: number) => {
    if (color && color.length === 6) {
      return `#${color}`;
    }
    
    // Fallback color palette
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--secondary))", 
      "hsl(var(--accent))",
      "#8884d8",
      "#82ca9d", 
      "#ffc658",
      "#ff7300",
      "#00ff7f",
      "#dc143c",
      "#9370db",
      "#20b2aa",
      "#ff6347",
      "#4682b4",
      "#d2691e",
      "#ff1493",
      "#00ced1",
      "#ff4500",
      "#32cd32",
      "#8a2be2",
      "#ff69b4"
    ];
    
    return colors[index % colors.length];
  };

  // Process data for tag analysis
  const getTagAnalysisData = () => {
    console.log('TagsComparator DEBUG - allLeads:', allLeads.length);
    console.log('TagsComparator DEBUG - tags:', tags.length);
    console.log('TagsComparator DEBUG - selectedPipeline:', selectedPipeline);
    console.log('TagsComparator DEBUG - sample lead with tags:', allLeads.find(l => l._embedded?.tags?.length)?.[ '_embedded']?.tags);
    
    if (!allLeads.length) {
      console.log('TagsComparator DEBUG - No leads found');
      return [];
    }

    // Filter leads by pipeline if selected and exclude unsorted leads by default
    const baseLeads = selectedPipeline === "all" 
      ? allLeads 
      : allLeads.filter(lead => lead.pipeline_id?.toString() === selectedPipeline);

    const filteredLeads = baseLeads.filter((lead: any) => !(typeof lead.id === 'string' && lead.id.startsWith('unsorted-')));

    // Group leads by tag
    const tagData: { [tagId: string]: { tag: any, leads: any[], totalValue: number, count: number } } = {};

    filteredLeads.forEach(lead => {
      // Get tags from lead (from _embedded.tags or similar structure)
      const leadTags = lead._embedded?.tags || lead.tags || [];
      
      if (leadTags.length === 0) {
        // Handle leads without tags
        const noTagKey = "no-tag";
        if (!tagData[noTagKey]) {
          tagData[noTagKey] = {
            tag: { id: -1, name: "Sem Tags", color: null },
            leads: [],
            totalValue: 0,
            count: 0
          };
        }
        tagData[noTagKey].leads.push(lead);
        tagData[noTagKey].totalValue += lead.price || 0;
        tagData[noTagKey].count++;
      } else {
        // Process each tag in the lead
        leadTags.forEach((leadTag: any) => {
          const tagKey = leadTag.id?.toString() || leadTag.name;
          if (!tagData[tagKey]) {
            tagData[tagKey] = {
              tag: leadTag,
              leads: [],
              totalValue: 0,
              count: 0
            };
          }
          tagData[tagKey].leads.push(lead);
          tagData[tagKey].totalValue += lead.price || 0;
          tagData[tagKey].count++;
        });
      }
    });

    // Convert to array
    let analysisArray = Object.values(tagData)
      .map((data, index) => ({
        tagName: data.tag.name.length > 20 ? data.tag.name.substring(0, 20) + "..." : data.tag.name,
        fullName: data.tag.name,
        color: data.tag.color,
        count: data.count,
        totalValue: data.totalValue,
        averageValue: data.count > 0 ? data.totalValue / data.count : 0,
        percentage: 0, // Will be recalculated after filtering
        fillColor: getTagColor(data.tag.color, index)
      }));

    // Filter out "Sem Tags" if showUntagged is false
    if (!showUntagged) {
      analysisArray = analysisArray.filter(item => item.fullName !== "Sem Tags");
    }

    // Recalculate percentages based on filtered data
    const totalCount = analysisArray.reduce((sum, item) => sum + item.count, 0);
    analysisArray = analysisArray.map(item => ({
      ...item,
      percentage: totalCount > 0 ? (item.count / totalCount) * 100 : 0
    }));

    // Sort and limit
    return analysisArray
      .sort((a, b) => b.count - a.count)
      .slice(0, chartType === "pie" ? 10 : 20); // Limit to 10 for pie chart visibility
  };

  const analysisData = getTagAnalysisData();
  const totalLeads = selectedPipeline === "all" 
    ? allLeads.length 
    : allLeads.filter(lead => lead.pipeline_id?.toString() === selectedPipeline).length;

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Comparador de Tags
          </CardTitle>
          <CardDescription>Carregando análise de tags...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando dados de tags...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Comparador de Tags
          </CardTitle>
          <CardDescription>
            Análise das principais tags por pipeline - distribuição e performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-64">
                <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Pipelines</SelectItem>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                        {pipeline.name} {pipeline.is_main && "(Principal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                Total de leads: {totalLeads}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex gap-2">
                <Button
                  variant={chartType === "pie" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartType("pie")}
                  className="flex items-center gap-2"
                >
                  <PieChartIcon className="h-4 w-4" />
                  Pizza
                </Button>
                <Button
                  variant={chartType === "bar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartType("bar")}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Barras
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="show-untagged"
                  checked={showUntagged}
                  onCheckedChange={setShowUntagged}
                />
                <Label htmlFor="show-untagged" className="text-sm cursor-pointer">
                  Exibir "Sem Tags"
                </Label>
              </div>
            </div>
          </div>

          {analysisData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Nenhum dado de tag encontrado para o pipeline selecionado.
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "pie" ? (
                  <PieChart>
                    <Pie
                      data={analysisData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({count}) => count}
                      outerRadius={115}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analysisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fillColor} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-medium">{data.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                Leads: {data.count} ({data.percentage.toFixed(1)}%)
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Valor total: R$ {data.totalValue.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Ticket médio: R$ {data.averageValue.toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      content={() => (
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                          {analysisData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs">
                              <div 
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: entry.fillColor }}
                              />
                              <span className="text-muted-foreground">
                                {entry.fullName} ({entry.count})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={analysisData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis 
                      dataKey="tagName" 
                      className="text-xs fill-muted-foreground"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-medium">{data.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                Leads: {data.count} ({data.percentage.toFixed(1)}%)
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Valor total: R$ {data.totalValue.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Ticket médio: R$ {data.averageValue.toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      className="fill-primary/80 hover:fill-primary"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {analysisData.length > 0 && (
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle>Detalhamento das Tags</CardTitle>
            <CardDescription>
              Estatísticas detalhadas por tag
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Participação</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          style={{
                            backgroundColor: item.color ? `#${item.color}20` : undefined,
                            borderColor: item.color ? `#${item.color}` : undefined,
                            color: item.color ? `#${item.color}` : undefined
                          }}
                        >
                          {item.fullName}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.count}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {item.percentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {item.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {item.averageValue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};