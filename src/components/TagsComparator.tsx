import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Tag } from "lucide-react";

interface TagsComparatorProps {
  tags: any[];
  allLeads: any[];
  pipelines: any[];
  loading: boolean;
}

export const TagsComparator = ({ tags, allLeads, pipelines, loading }: TagsComparatorProps) => {
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all");

  // Process data for tag analysis
  const getTagAnalysisData = () => {
    if (!allLeads.length) return [];

    // Filter leads by pipeline if selected
    const filteredLeads = selectedPipeline === "all" 
      ? allLeads 
      : allLeads.filter(lead => lead.pipeline_id?.toString() === selectedPipeline);

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

    // Convert to array and sort by count
    return Object.values(tagData)
      .map(data => ({
        tagName: data.tag.name.length > 20 ? data.tag.name.substring(0, 20) + "..." : data.tag.name,
        fullName: data.tag.name,
        color: data.tag.color,
        count: data.count,
        totalValue: data.totalValue,
        averageValue: data.count > 0 ? data.totalValue / data.count : 0,
        percentage: filteredLeads.length > 0 ? (data.count / filteredLeads.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 tags
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

          {analysisData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Nenhum dado de tag encontrado para o pipeline selecionado.
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
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