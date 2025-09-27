import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, Clock, Users, ArrowRight, X, Search } from "lucide-react";
import { Pipeline, Lead } from "@/services/kommoApi";

interface LeadJourneyMapProps {
  allLeads: Lead[];
  pipelines: Pipeline[];
  selectedPipeline: number | null;
}

interface JourneyStep {
  statusId: number;
  statusName: string;
  color: string;
  sort: number;
  leads: Lead[];
  avgTimeInStatus: number;
  conversionRate: number;
  dropoffRate: number;
  totalValue: number;
}

interface LeadFlow {
  from: string;
  to: string;
  count: number;
  percentage: number;
  avgTime: number;
}

interface StatusTransition {
  fromStatusId: number;
  toStatusId: number;
  leads: Lead[];
  avgTransitionTime: number;
  conversionRate: number;
  totalValue: number;
  periodDays: number;
}

export const LeadJourneyMap = ({ 
  allLeads, 
  pipelines, 
  selectedPipeline 
}: LeadJourneyMapProps) => {
  console.log("LeadJourneyMap rendering:", { allLeads: allLeads?.length, pipelines: pipelines?.length, selectedPipeline });
  
  // Status transition analyzer state
  const [selectedFromStatus, setSelectedFromStatus] = useState<number | null>(null);
  const [selectedToStatus, setSelectedToStatus] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30); // days
  
  if (!allLeads || !pipelines) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Dados não disponíveis</p>
      </div>
    );
  }
  
  const currentPipeline = useMemo(() => {
    return selectedPipeline ? 
      pipelines.find(p => p.id === selectedPipeline) : 
      pipelines.find(p => p.is_main) || pipelines[0];
  }, [pipelines, selectedPipeline]);

  // Calculate journey steps
  const journeySteps = useMemo((): JourneyStep[] => {
    if (!currentPipeline) return [];

    const statuses = currentPipeline.statuses.sort((a, b) => a.sort - b.sort);
    const pipelineLeads = allLeads.filter(lead => lead.pipeline_id === currentPipeline.id);
    const now = Date.now();

      return statuses.map((status, index) => {
        const leadsInStatus = pipelineLeads.filter(lead => lead.status_id === status.id);

        // Calculate average time in status using safe fallbacks
        const avgTimeInStatus = leadsInStatus.length > 0 ?
          leadsInStatus.reduce((sum, lead) => {
            const daysSinceCreated = Number.isFinite(lead.created_at)
              ? (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000)
              : 0;
            const daysSinceUpdate = typeof lead.updated_at === 'number'
              ? (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000)
              : daysSinceCreated;
            return sum + (Number.isFinite(daysSinceUpdate) ? daysSinceUpdate : 0);
          }, 0) / leadsInStatus.length : 0;

        // Estimate conversion rate to next status using snapshot counts
        const nextStatus = statuses[index + 1];
        let conversionRate = 100;
        if (nextStatus) {
          const nextCount = pipelineLeads.filter(lead => lead.status_id === nextStatus.id).length;
          // Bound to 0..100 to avoid absurd values when next has more leads than current
          conversionRate = Math.min(100, Math.max(0, (Math.min(nextCount, leadsInStatus.length) / Math.max(leadsInStatus.length, 1)) * 100));
        }

        // Dropoff is complementary and bounded to 0..100
        const dropoffRate = index < statuses.length - 1 ? Math.max(0, 100 - conversionRate) : 0;

        // Calculate total value in this status
        const totalValue = leadsInStatus.reduce((sum, lead) => sum + (lead.price || 0), 0);

        return {
          statusId: status.id,
          statusName: status.name,
          color: status.color,
          sort: status.sort,
          leads: leadsInStatus,
          avgTimeInStatus: Number.isFinite(avgTimeInStatus) ? avgTimeInStatus : 0,
          conversionRate,
          dropoffRate,
          totalValue
        };
      });
  }, [allLeads, currentPipeline]);

  // Calculate lead flows between statuses
  const leadFlows = useMemo((): LeadFlow[] => {
    if (!currentPipeline || journeySteps.length < 2) return [];

    const flows: LeadFlow[] = [];
    
    for (let i = 0; i < journeySteps.length - 1; i++) {
      const currentStep = journeySteps[i];
      const nextStep = journeySteps[i + 1];
      
      const rawNextCount = nextStep.leads.length;
      const flowCount = Math.min(currentStep.leads.length, rawNextCount);
      const flowPercentage = currentStep.leads.length > 0 ? 
        Math.min(100, Math.max(0, (flowCount / currentStep.leads.length) * 100)) : 0;
      
      // Simplified average time calculation
      const avgTime = Number.isFinite(currentStep.avgTimeInStatus) ? currentStep.avgTimeInStatus : 0;
      
      flows.push({
        from: currentStep.statusName,
        to: nextStep.statusName,
        count: flowCount,
        percentage: flowPercentage,
        avgTime
      });
    }

    return flows;
  }, [journeySteps, currentPipeline]);

  // Calculate overall journey metrics
  const journeyMetrics = useMemo(() => {
    if (!journeySteps.length) return null;

    const totalLeads = journeySteps.reduce((sum, step) => sum + step.leads.length, 0);
    const totalValue = journeySteps.reduce((sum, step) => sum + step.totalValue, 0);
    const avgJourneyTime = journeySteps.reduce((sum, step) => sum + (Number.isFinite(step.avgTimeInStatus) ? step.avgTimeInStatus : 0), 0);
    const lastStepLeads = journeySteps[journeySteps.length - 1].leads.length;
    const overallConversionRate = totalLeads > 0 ? (lastStepLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      totalValue,
      avgJourneyTime: Number.isFinite(avgJourneyTime) ? avgJourneyTime : 0,
      overallConversionRate: Math.min(100, Math.max(0, overallConversionRate)),
      totalSteps: journeySteps.length
    };
  }, [journeySteps]);

  // Calculate specific status transition with time period filter
  const statusTransition = useMemo((): StatusTransition | null => {
    if (!selectedFromStatus || !selectedToStatus || !currentPipeline) return null;
    
    const pipelineLeads = allLeads.filter(lead => lead.pipeline_id === currentPipeline.id);
    const now = Date.now();
    const periodStart = now - (selectedPeriod * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    
    // Find leads that transitioned from origin to destination status in the period
    // Since we don't have full status history, we'll use a heuristic:
    // - Leads currently in destination status
    // - That were updated within the period
    // - And have creation date before the period (so they existed before and moved during period)
    const transitionLeads = pipelineLeads.filter(lead => {
      // Must be in destination status
      if (lead.status_id !== selectedToStatus) return false;
      
      // Must have been updated within the period (indicating recent activity/status change)
      const leadUpdateTime = (lead.updated_at || lead.created_at) * 1000;
      if (leadUpdateTime < periodStart) return false;
      
      // Must have been created before the period (so they existed and could transition)
      const leadCreationTime = lead.created_at * 1000;
      if (leadCreationTime >= periodStart) return false;
      
      return true;
    });

    // Get current count of leads in origin status for comparison
    const currentFromStatusLeads = pipelineLeads.filter(lead => lead.status_id === selectedFromStatus);
    
    // Calculate average days since the transition (time since last update)
    const avgTransitionTime = transitionLeads.length > 0 ? 
      transitionLeads.reduce((sum, lead) => {
        const leadUpdateTime = (lead.updated_at || lead.created_at) * 1000;
        const daysSinceUpdate = (now - leadUpdateTime) / (24 * 60 * 60 * 1000);
        return sum + daysSinceUpdate;
      }, 0) / transitionLeads.length : 0;

    // Calculate transition rate as percentage of leads that moved vs current origin status count
    const transitionRate = currentFromStatusLeads.length > 0 ? 
      (transitionLeads.length / (currentFromStatusLeads.length + transitionLeads.length)) * 100 : 0;

    // Get total value of leads that transitioned in the period
    const totalTransitionValue = transitionLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);

    return {
      fromStatusId: selectedFromStatus,
      toStatusId: selectedToStatus,
      leads: transitionLeads,
      avgTransitionTime,
      conversionRate: transitionRate,
      totalValue: totalTransitionValue,
      periodDays: selectedPeriod
    };
  }, [selectedFromStatus, selectedToStatus, allLeads, currentPipeline, selectedPeriod]);

  if (!currentPipeline || !journeySteps.length) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Selecione um pipeline para visualizar a jornada dos leads</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Overview */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Jornada do Pipeline: {currentPipeline.name}
          </CardTitle>
          <CardDescription>
            Visualização completa do fluxo de leads através das etapas
          </CardDescription>
        </CardHeader>
        {journeyMetrics && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{journeyMetrics.totalLeads}</div>
                <div className="text-sm text-muted-foreground">Total de Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  R$ {(journeyMetrics.totalValue / 1000).toFixed(0)}k
                </div>
                <div className="text-sm text-muted-foreground">Valor Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {journeyMetrics.avgJourneyTime.toFixed(0)} dias
                </div>
                <div className="text-sm text-muted-foreground">Tempo Médio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-info">
                  {journeyMetrics.overallConversionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Taxa Geral</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Status Transition Analyzer */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Analisador de Transições
          </CardTitle>
          <CardDescription>
            Analise o fluxo específico entre dois status do seu pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status de Origem</label>
              <Select value={selectedFromStatus?.toString() || ""} onValueChange={(value) => setSelectedFromStatus(value ? parseInt(value) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status inicial" />
                </SelectTrigger>
                <SelectContent>
                  {currentPipeline.statuses.map(status => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Status de Destino</label>
              <Select value={selectedToStatus?.toString() || ""} onValueChange={(value) => setSelectedToStatus(value ? parseInt(value) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status final" />
                </SelectTrigger>
                <SelectContent>
                  {currentPipeline.statuses.map(status => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={selectedPeriod.toString()} onValueChange={(value) => setSelectedPeriod(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="180">Últimos 180 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedFromStatus(null);
                  setSelectedToStatus(null);
                }}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Transition Results */}
          {statusTransition && selectedFromStatus && selectedToStatus && (
            <div className="mt-6 p-4 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-semibold">
                    {currentPipeline.statuses.find(s => s.id === selectedFromStatus)?.name} → {currentPipeline.statuses.find(s => s.id === selectedToStatus)?.name}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Últimos {statusTransition.periodDays} dias
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{statusTransition.leads.length}</div>
                  <div className="text-sm text-muted-foreground">Leads que Entraram</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">R$ {(statusTransition.totalValue / 1000).toFixed(0)}k</div>
                  <div className="text-sm text-muted-foreground">Valor Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-info">{statusTransition.conversionRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Taxa de Conversão</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">{statusTransition.avgTransitionTime.toFixed(0)} dias</div>
                  <div className="text-sm text-muted-foreground">Tempo Médio</div>
                </div>
              </div>

              {/* Leads List */}
              {statusTransition.leads.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">
                    Leads que entraram no status {currentPipeline.statuses.find(s => s.id === selectedToStatus)?.name} nos últimos {statusTransition.periodDays} dias:
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {statusTransition.leads.slice(0, 10).map(lead => (
                      <div key={lead.id} className="text-sm flex justify-between items-center p-2 rounded bg-background/50">
                        <span>{lead.name}</span>
                        <span className="text-muted-foreground">
                          R$ {((lead.price || 0) / 1000).toFixed(0)}k
                        </span>
                      </div>
                    ))}
                    {statusTransition.leads.length > 10 && (
                      <div className="text-xs text-muted-foreground text-center pt-2">
                        +{statusTransition.leads.length - 10} leads adicionais
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {statusTransition.leads.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum lead entrou no status {currentPipeline.statuses.find(s => s.id === selectedToStatus)?.name} nos últimos {statusTransition.periodDays} dias
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journey Visualization */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mapa da Jornada
          </CardTitle>
          <CardDescription>
            Fluxo detalhado entre cada etapa do pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journeySteps.map((step, index) => (
              <div key={step.statusId}>
                {/* Status Step */}
                <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  (selectedFromStatus === step.statusId || selectedToStatus === step.statusId) 
                    ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/20' 
                    : 'border-border/50 bg-card/30'
                }`}>
                  <div 
                    className={`w-4 h-4 rounded-full flex-shrink-0 ${
                      (selectedFromStatus === step.statusId || selectedToStatus === step.statusId) 
                        ? 'ring-2 ring-primary/50' 
                        : ''
                    }`}
                    style={{ backgroundColor: step.color }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold truncate">{step.statusName}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {step.leads.length} leads
                        </Badge>
                        <Badge variant="outline">
                          R$ {(step.totalValue / 1000).toFixed(0)}k
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tempo médio:</span>
                        <div className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {step.avgTimeInStatus.toFixed(1)} dias
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Taxa de conversão:</span>
                        <div className="font-medium text-success">
                          {step.conversionRate.toFixed(1)}%
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Taxa de abandono:</span>
                        <div className="font-medium text-destructive">
                          {step.dropoffRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Progress bar for lead distribution */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Distribuição de leads</span>
                        <span>{((step.leads.length / journeyMetrics!.totalLeads) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={(step.leads.length / journeyMetrics!.totalLeads) * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Flow Arrow */}
                {index < journeySteps.length - 1 && leadFlows[index] && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-full px-3 py-1">
                      <ArrowRight className="h-4 w-4" />
                      <span>{leadFlows[index].count} leads</span>
                      <span>({leadFlows[index].percentage.toFixed(1)}%)</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{leadFlows[index].avgTime.toFixed(1)} dias</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Journey Insights */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Insights da Jornada
          </CardTitle>
          <CardDescription>
            Análises e recomendações baseadas no comportamento dos leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bottleneck Analysis */}
            {(() => {
              const bottleneck = journeySteps.reduce((prev, current) => 
                current.avgTimeInStatus > prev.avgTimeInStatus ? current : prev
              );
              
              return (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="font-semibold text-warning">Gargalo Identificado</span>
                  </div>
                  <p className="text-sm">
                    O status <strong>{bottleneck.statusName}</strong> apresenta o maior tempo médio ({bottleneck.avgTimeInStatus.toFixed(1)} dias).
                    Considere revisar os processos desta etapa para acelerar o fluxo.
                  </p>
                </div>
              );
            })()}

            {/* High Dropoff Alert */}
            {(() => {
              const highDropoff = journeySteps.find(step => step.dropoffRate > 50);
              
              if (highDropoff) {
                return (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-destructive rotate-180" />
                      <span className="font-semibold text-destructive">Alta Taxa de Abandono</span>
                    </div>
                    <p className="text-sm">
                      O status <strong>{highDropoff.statusName}</strong> tem uma taxa de abandono de {highDropoff.dropoffRate.toFixed(1)}%.
                      Investigue as causas e implemente estratégias de retenção.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Success Pattern */}
            {(() => {
              const bestConversion = journeySteps.reduce((prev, current) => 
                current.conversionRate > prev.conversionRate ? current : prev
              );
              
              if (bestConversion.conversionRate > 80) {
                return (
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="font-semibold text-success">Padrão de Sucesso</span>
                    </div>
                    <p className="text-sm">
                      O status <strong>{bestConversion.statusName}</strong> apresenta excelente performance ({bestConversion.conversionRate.toFixed(1)}% de conversão).
                      Use este status como modelo para otimizar outras etapas.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};