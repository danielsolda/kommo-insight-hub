import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, TrendingUp, Target, AlertTriangle, Zap, DollarSign } from "lucide-react";
import { Pipeline, Lead, User } from "@/services/kommoApi";

interface PredictiveInsightsProps {
  allLeads: Lead[];
  pipelines: Pipeline[];
  users: User[];
  selectedPipeline: number | null;
  selectedUser: number | null;
}

interface LeadPrediction {
  lead: Lead;
  conversionScore: number;
  riskScore: number;
  expectedCloseDate: Date;
  recommendedActions: string[];
  predictedValue: number;
}

interface RevenueProjection {
  currentMonth: number;
  nextMonth: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export const PredictiveInsights = ({ 
  allLeads, 
  pipelines, 
  users, 
  selectedPipeline, 
  selectedUser 
}: PredictiveInsightsProps) => {

  // Calculate predictive scores for active leads
  const leadPredictions = useMemo((): LeadPrediction[] => {
    const now = Date.now();
    const filteredLeads = allLeads.filter(lead => {
      if (lead.closed_at) return false; // Only active leads
      if (selectedPipeline && lead.pipeline_id !== selectedPipeline) return false;
      if (selectedUser && lead.responsible_user_id !== selectedUser) return false;
      return true;
    });

    return filteredLeads.map(lead => {
      const daysSinceCreated = (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000);
      const daysSinceUpdate = (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
      
      // Calculate conversion score (0-100)
      let conversionScore = 50; // Base score
      
      // Recent activity increases score
      if (daysSinceUpdate <= 1) conversionScore += 30;
      else if (daysSinceUpdate <= 3) conversionScore += 20;
      else if (daysSinceUpdate <= 7) conversionScore += 10;
      else conversionScore -= 20;
      
      // Lead age factor
      if (daysSinceCreated <= 7) conversionScore += 15;
      else if (daysSinceCreated <= 30) conversionScore += 5;
      else if (daysSinceCreated > 90) conversionScore -= 25;
      
      // Value factor
      if (lead.price > 10000) conversionScore += 10;
      else if (lead.price > 5000) conversionScore += 5;
      
      conversionScore = Math.max(0, Math.min(100, conversionScore));
      
      // Calculate risk score (inverse of conversion factors)
      let riskScore = 100 - conversionScore;
      
      // Additional risk factors
      if (daysSinceUpdate > 14) riskScore += 20;
      if (daysSinceCreated > 60) riskScore += 15;
      
      riskScore = Math.max(0, Math.min(100, riskScore));
      
      // Predict close date based on historical data
      const avgConversionTime = 30; // Simplified - could be calculated from historical data
      const expectedCloseDate = new Date(now + (avgConversionTime * 24 * 60 * 60 * 1000));
      
      // Generate recommended actions
      const recommendedActions: string[] = [];
      if (daysSinceUpdate > 3) recommendedActions.push("Fazer contato imediato");
      if (conversionScore < 30) recommendedActions.push("Revisar estratégia de abordagem");
      if (lead.price > 5000) recommendedActions.push("Priorizar follow-up");
      if (daysSinceCreated > 45) recommendedActions.push("Considerar campanha de reativação");
      
      return {
        lead,
        conversionScore,
        riskScore,
        expectedCloseDate,
        recommendedActions,
        predictedValue: lead.price * (conversionScore / 100)
      };
    }).sort((a, b) => b.conversionScore - a.conversionScore);
  }, [allLeads, selectedPipeline, selectedUser]);

  // Calculate revenue projections
  const revenueProjection = useMemo((): RevenueProjection => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculate current month revenue (closed deals)
    const currentMonthRevenue = allLeads
      .filter(lead => {
        if (!lead.closed_at || lead.status_id !== 142) return false;
        const closeDate = new Date(lead.closed_at * 1000);
        return closeDate.getMonth() === currentMonth && closeDate.getFullYear() === currentYear;
      })
      .reduce((sum, lead) => sum + (lead.price || 0), 0);
    
    // Predict next month revenue based on high-probability leads
    const highProbabilityLeads = leadPredictions.filter(pred => pred.conversionScore > 70);
    const nextMonthRevenue = highProbabilityLeads.reduce((sum, pred) => sum + pred.predictedValue, 0);
    
    // Calculate confidence based on number of predictions
    const confidence = Math.min(90, 40 + (highProbabilityLeads.length * 5));
    
    // Determine trend
    const trend = nextMonthRevenue > currentMonthRevenue ? 'up' : 
                  nextMonthRevenue < currentMonthRevenue * 0.9 ? 'down' : 'stable';
    
    return {
      currentMonth: currentMonthRevenue,
      nextMonth: nextMonthRevenue,
      confidence,
      trend
    };
  }, [allLeads, leadPredictions]);

  // Identify top opportunities
  const topOpportunities = useMemo(() => {
    return leadPredictions
      .filter(pred => pred.conversionScore > 60 && pred.lead.price > 1000)
      .slice(0, 5);
  }, [leadPredictions]);

  // Identify high-risk leads
  const highRiskLeads = useMemo(() => {
    return leadPredictions
      .filter(pred => pred.riskScore > 70)
      .slice(0, 5);
  }, [leadPredictions]);

  return (
    <div className="space-y-6">
      {/* Revenue Projection */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Projeção de Receita
          </CardTitle>
          <CardDescription>
            Previsão baseada em análise preditiva dos leads ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Mês Atual</div>
              <div className="text-2xl font-bold">
                R$ {(revenueProjection.currentMonth / 1000).toFixed(0)}k
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Projeção Próximo Mês</div>
              <div className="text-2xl font-bold text-primary">
                R$ {(revenueProjection.nextMonth / 1000).toFixed(0)}k
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className={`h-4 w-4 ${
                  revenueProjection.trend === 'up' ? 'text-success' : 
                  revenueProjection.trend === 'down' ? 'text-destructive rotate-180' : 
                  'text-muted-foreground'
                }`} />
                <span className="text-sm text-muted-foreground">
                  {revenueProjection.trend === 'up' ? 'Crescimento' : 
                   revenueProjection.trend === 'down' ? 'Declínio' : 'Estável'}
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Confiança</div>
              <div className="text-2xl font-bold text-info">
                {revenueProjection.confidence}%
              </div>
              <Progress value={revenueProjection.confidence} className="h-2 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Opportunities */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Principais Oportunidades
          </CardTitle>
          <CardDescription>
            Leads com maior probabilidade de conversão que merecem atenção prioritária
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topOpportunities.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma oportunidade de alta probabilidade identificada
              </p>
            ) : (
              topOpportunities.map((pred, index) => {
                const pipeline = pipelines.find(p => p.id === pred.lead.pipeline_id);
                const status = pipeline?.statuses.find(s => s.id === pred.lead.status_id);
                const user = users.find(u => u.id === pred.lead.responsible_user_id);
                
                return (
                  <div key={pred.lead.id} className="p-4 rounded-lg border border-border/50 bg-card/30">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{pred.lead.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {user?.name} • {status?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="secondary" 
                          className="bg-success/20 text-success border-success/30"
                        >
                          {pred.conversionScore}% probabilidade
                        </Badge>
                        <div className="text-sm font-medium mt-1">
                          R$ {(pred.lead.price / 1000).toFixed(0)}k
                        </div>
                      </div>
                    </div>
                    
                    {pred.recommendedActions.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Ações Recomendadas:</div>
                        {pred.recommendedActions.map((action, actionIndex) => (
                          <div key={actionIndex} className="text-xs flex items-center gap-1">
                            <Zap className="h-3 w-3 text-primary" />
                            {action}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* High Risk Leads */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Leads de Alto Risco
          </CardTitle>
          <CardDescription>
            Leads que precisam de atenção imediata para evitar perda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {highRiskLeads.length === 0 ? (
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  Excelente! Nenhum lead de alto risco identificado no momento.
                </AlertDescription>
              </Alert>
            ) : (
              highRiskLeads.map((pred, index) => {
                const pipeline = pipelines.find(p => p.id === pred.lead.pipeline_id);
                const status = pipeline?.statuses.find(s => s.id === pred.lead.status_id);
                const user = users.find(u => u.id === pred.lead.responsible_user_id);
                const daysSinceUpdate = (Date.now() - (pred.lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
                
                return (
                  <div key={pred.lead.id} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{pred.lead.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {user?.name} • {status?.name}
                        </p>
                        <p className="text-xs text-destructive mt-1">
                          Sem atividade há {Math.floor(daysSinceUpdate)} dias
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="destructive"
                        >
                          {pred.riskScore}% risco
                        </Badge>
                        <div className="text-sm font-medium mt-1">
                          R$ {(pred.lead.price / 1000).toFixed(0)}k
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-destructive">Ações Urgentes:</div>
                      {pred.recommendedActions.map((action, actionIndex) => (
                        <div key={actionIndex} className="text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Predictive Summary */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Resumo Preditivo
          </CardTitle>
          <CardDescription>
            Insights gerais baseados na análise comportamental
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Estatísticas Gerais</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total de leads analisados:</span>
                  <span className="font-medium">{leadPredictions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alta probabilidade (&gt;70%):</span>
                  <span className="font-medium text-success">
                    {leadPredictions.filter(p => p.conversionScore > 70).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Média probabilidade (30-70%):</span>
                  <span className="font-medium text-warning">
                    {leadPredictions.filter(p => p.conversionScore >= 30 && p.conversionScore <= 70).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Baixa probabilidade (&lt;30%):</span>
                  <span className="font-medium text-destructive">
                    {leadPredictions.filter(p => p.conversionScore < 30).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Valor Potencial</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Valor total em pipeline:</span>
                  <span className="font-medium">
                    R$ {(leadPredictions.reduce((sum, p) => sum + p.lead.price, 0) / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Valor previsto (ponderado):</span>
                  <span className="font-medium text-primary">
                    R$ {(leadPredictions.reduce((sum, p) => sum + p.predictedValue, 0) / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de conversão esperada:</span>
                  <span className="font-medium text-info">
                    {leadPredictions.length > 0 ? 
                      (leadPredictions.reduce((sum, p) => sum + p.conversionScore, 0) / leadPredictions.length).toFixed(1) 
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};