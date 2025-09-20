import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, Target, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversionMetrics } from "./ConversionMetrics";
import { TimeAnalysisChart } from "./TimeAnalysisChart";
import { useState } from "react";

interface PipelineStats {
  pipelineId: number;
  pipelineName: string;
  statuses: Array<{
    id: number;
    name: string;
    count: number;
    value: number;
    color: string;
  }>;
}

interface PipelineChartProps {
  pipelineStats?: PipelineStats;
  loading?: boolean;
  conversionTimeData?: any;
  timeAnalysisData?: any;
  onCalculateConversionTime?: (pipelineId?: number | null) => any;
  onCalculateTimeAnalysis?: (pipelineId?: number | null) => any;
}

export const PipelineChart = ({ 
  pipelineStats, 
  loading = false, 
  conversionTimeData,
  timeAnalysisData,
  onCalculateConversionTime,
  onCalculateTimeAnalysis
}: PipelineChartProps) => {
  const [viewMode, setViewMode] = useState<'overview' | 'conversion'>('overview');

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
          <CardDescription>
            Carregando dados do pipeline...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pipelineStats || !pipelineStats.statuses.length) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
          <CardDescription>
            Selecione um pipeline para visualizar os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <Target className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum dado disponível para este pipeline</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get conversion data when switching to conversion view
  const handleConversionData = () => {
    if (viewMode === 'conversion' && onCalculateConversionTime && onCalculateTimeAnalysis) {
      const conversionData = onCalculateConversionTime(pipelineStats.pipelineId);
      const analysisData = onCalculateTimeAnalysis(pipelineStats.pipelineId);
      return { conversionData, analysisData };
    }
    return { conversionData: conversionTimeData, analysisData: timeAnalysisData };
  };

  const { conversionData, analysisData } = handleConversionData();

  // Prepare data for charts
  const pipelineData = pipelineStats.statuses.map(status => ({
    name: status.name,
    leads: status.count,
    value: status.value,
  }));

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{pipelineStats.pipelineName}</CardTitle>
            <CardDescription>
              {viewMode === 'overview' 
                ? 'Distribuição de leads por estágio do pipeline'
                : 'Análise de tempo de conversão e gargalos'
              }
            </CardDescription>
          </div>
          
          {/* Toggle Buttons */}
          <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('overview')}
              className="h-8 px-3"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Visão Geral
            </Button>
            <Button
              variant={viewMode === 'conversion' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('conversion')}
              className="h-8 px-3"
            >
              <Clock className="h-4 w-4 mr-1" />
              Tempo Conversão
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'overview' ? (
          <>
            {/* Original Pipeline Overview */}
            <div className="min-h-[400px] mb-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))"
                    }}
                    formatter={(value, name) => [
                      name === 'leads' ? `${value} leads` : `R$ ${value.toLocaleString()}`,
                      name === 'leads' ? 'Leads' : 'Valor'
                    ]}
                  />
                  <Bar 
                    dataKey="leads" 
                    fill="url(#gradientBar)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary-glow))" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pipelineData.map((stage, index) => (
                <div key={index} className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground truncate" title={stage.name}>
                    {stage.name}
                  </div>
                  <div className="text-lg font-bold">{stage.leads}</div>
                  <div className="text-xs text-muted-foreground">
                    R$ {stage.value > 1000 ? (stage.value / 1000).toFixed(0) + 'k' : stage.value.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Conversion Time Analysis View */}
            <ConversionMetrics 
              data={conversionData} 
              loading={loading}
            />
            <TimeAnalysisChart 
              data={analysisData} 
              loading={loading}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};