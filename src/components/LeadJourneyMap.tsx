import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MapPin, TrendingUp, Clock, Users, ArrowRight } from "lucide-react";
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

export const LeadJourneyMap = ({ 
  allLeads, 
  pipelines, 
  selectedPipeline 
}: LeadJourneyMapProps) => {
  console.log("LeadJourneyMap rendering:", { allLeads: allLeads?.length, pipelines: pipelines?.length, selectedPipeline });
  
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
      const totalLeadsUpToThisStatus = pipelineLeads.filter(lead => {
        const leadStatusSort = statuses.find(s => s.id === lead.status_id)?.sort || 0;
        return leadStatusSort <= status.sort;
      });

      // Calculate average time in status (simplified - using update time as proxy)
      const avgTimeInStatus = leadsInStatus.length > 0 ? 
        leadsInStatus.reduce((sum, lead) => {
          const daysSinceUpdate = (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
          return sum + daysSinceUpdate;
        }, 0) / leadsInStatus.length : 0;

      // Calculate conversion rate (leads that moved from this status to next)
      const nextStatus = statuses[index + 1];
      const conversionRate = nextStatus ? 
        (pipelineLeads.filter(lead => lead.status_id === nextStatus.id).length / Math.max(leadsInStatus.length, 1)) * 100 : 
        100;

      // Calculate dropoff rate
      const dropoffRate = index < statuses.length - 1 ? 100 - conversionRate : 0;

      // Calculate total value in this status
      const totalValue = leadsInStatus.reduce((sum, lead) => sum + (lead.price || 0), 0);

      return {
        statusId: status.id,
        statusName: status.name,
        color: status.color,
        sort: status.sort,
        leads: leadsInStatus,
        avgTimeInStatus,
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
      
      const flowCount = nextStep.leads.length;
      const flowPercentage = currentStep.leads.length > 0 ? 
        (flowCount / currentStep.leads.length) * 100 : 0;
      
      // Simplified average time calculation
      const avgTime = currentStep.avgTimeInStatus;
      
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
    const avgJourneyTime = journeySteps.reduce((sum, step) => sum + step.avgTimeInStatus, 0);
    const overallConversionRate = journeySteps.length > 0 ? 
      (journeySteps[journeySteps.length - 1].leads.length / Math.max(journeySteps[0].leads.length, 1)) * 100 : 0;

    return {
      totalLeads,
      totalValue,
      avgJourneyTime,
      overallConversionRate,
      totalSteps: journeySteps.length
    };
  }, [journeySteps]);

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
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/30">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
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