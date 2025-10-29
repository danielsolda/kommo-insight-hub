import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, TrendingDown, Clock, ArrowRight, Info } from 'lucide-react';
import { Lead, Pipeline } from '@/services/kommoApi';
import { useFunnelAnalytics, ConversionStep } from '@/hooks/useFunnelAnalytics';
import { useFilteredLeads } from '@/hooks/useFilteredData';

interface FunnelAnalysisProps {
  allLeads: Lead[];
  pipelines: Pipeline[];
  selectedPipeline: number | null;
}

const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
  switch (severity) {
    case 'high':
      return 'border-l-destructive bg-destructive/5';
    case 'medium':
      return 'border-l-warning bg-warning/5';
    default:
      return 'border-l-success bg-success/5';
  }
};

const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
  switch (severity) {
    case 'high':
      return { variant: 'destructive' as const, label: 'Crítico' };
    case 'medium':
      return { variant: 'default' as const, label: 'Atenção' };
    default:
      return { variant: 'secondary' as const, label: 'OK' };
  }
};

const BottleneckCard = ({ step }: { step: ConversionStep }) => {
  const badge = getSeverityBadge(step.bottleneckSeverity);
  
  return (
    <Card className={`border-l-4 ${getSeverityColor(step.bottleneckSeverity)}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{step.fromStatusName}</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{step.toStatusName}</span>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <CardDescription>Análise de conversão entre etapas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              <span>Taxa de Conversão</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: step.color }}>
              {step.conversionRate.toFixed(1)}%
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Tempo Médio</span>
            </div>
            <div className="text-2xl font-bold">
              {step.avgTransitionTime.toFixed(1)}d
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Leads no início:</span>
            <span className="font-medium">{step.totalLeadsAtStart}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Leads convertidos:</span>
            <span className="font-medium text-success">{step.convertedLeads}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Leads perdidos:</span>
            <span className="font-medium text-destructive">{step.droppedLeads}</span>
          </div>
        </div>

        <Progress 
          value={step.conversionRate} 
          className="h-2"
        />

        {step.bottleneckSeverity !== 'low' && (
          <Alert variant={step.bottleneckSeverity === 'high' ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {step.bottleneckSeverity === 'high' ? (
                <>Taxa de conversão crítica. Apenas {step.conversionRate.toFixed(0)}% dos leads avançam para a próxima etapa.</>
              ) : (
                <>Taxa de conversão abaixo do ideal. Recomenda-se análise de processo nesta etapa.</>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const FunnelAnalysis = ({ allLeads, pipelines, selectedPipeline }: FunnelAnalysisProps) => {
  console.log('🎯 FunnelAnalysis renderizado:', {
    allLeadsCount: allLeads?.length || 0,
    pipelinesCount: pipelines?.length || 0,
    selectedPipeline
  });

  const filteredLeads = useFilteredLeads(allLeads);
  console.log('✅ Leads filtrados:', filteredLeads.length);

  const { identifyBottlenecks, calculateStepConversions } = useFunnelAnalytics(filteredLeads, pipelines);

  const activePipelineId = selectedPipeline || pipelines[0]?.id;
  const pipeline = pipelines.find(p => p.id === activePipelineId);
  
  console.log('📍 Pipeline ativo:', { activePipelineId, pipelineName: pipeline?.name });
  
  if (!activePipelineId || !pipeline) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nenhum pipeline disponível para análise
          </p>
        </CardContent>
      </Card>
    );
  }

  const bottlenecks = identifyBottlenecks(activePipelineId);
  const allSteps = calculateStepConversions(activePipelineId);

  const avgConversionRate = allSteps.length > 0
    ? allSteps.reduce((sum, step) => sum + step.conversionRate, 0) / allSteps.length
    : 0;

  const criticalBottlenecks = bottlenecks.filter(b => b.bottleneckSeverity === 'high');
  const mediumBottlenecks = bottlenecks.filter(b => b.bottleneckSeverity === 'medium');

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa Média de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Média entre todas as etapas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Gargalos Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalBottlenecks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Etapas com conversão {'<'} 70%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Atenção Necessária</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{mediumBottlenecks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Etapas com conversão 70-85%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição Atual no Funil */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">📊 Distribuição Atual no Funil</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Taxa de conversão calculada baseada em leads que alcançaram cada etapa. Análise cumulativa do volume do funil.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>Quantidade de leads em cada status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pipeline.statuses.sort((a, b) => a.sort - b.sort).map(status => {
              const count = filteredLeads.filter(l => l.status_id === status.id).length;
              const percentage = filteredLeads.length > 0 
                ? (count / filteredLeads.length * 100).toFixed(1) 
                : '0.0';
              
              return (
                <div key={status.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{status.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{count} leads</span>
                      <Badge variant="secondary">{percentage}%</Badge>
                    </div>
                  </div>
                  <Progress value={parseFloat(percentage)} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gargalos Identificados */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">🔴 Gargalos Identificados</h3>
          <p className="text-sm text-muted-foreground">
            Etapas com menor taxa de conversão ou maior tempo de permanência
          </p>
        </div>

        {bottlenecks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bottlenecks.map((step) => (
              <BottleneckCard key={`${step.fromStatusId}-${step.toStatusId}`} step={step} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-lg font-medium text-success mb-2">✅ Nenhum gargalo crítico identificado</p>
                <p className="text-sm text-muted-foreground">
                  Todas as etapas estão com performance satisfatória
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Todas as Conversões */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">📊 Todas as Conversões</h3>
          <p className="text-sm text-muted-foreground">
            Visão completa do funil com todas as etapas
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {allSteps.map((step) => (
            <Card key={`${step.fromStatusId}-${step.toStatusId}`} className="border-l-4" style={{ borderLeftColor: step.color }}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{step.fromStatusName}</CardTitle>
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-sm font-medium">{step.toStatusName}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Conversão:</span>
                  <span className="text-lg font-bold" style={{ color: step.color }}>
                    {step.conversionRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={step.conversionRate} className="h-1.5" />
                <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                  <span>{step.convertedLeads} / {step.totalLeadsAtStart} leads</span>
                  <span>{step.avgTransitionTime.toFixed(1)}d médio</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
