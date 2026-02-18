import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BehaviorMetrics } from "@/components/BehaviorMetrics";
import { LeadJourneyMap } from "@/components/LeadJourneyMap";
import { PredictiveInsights } from "@/components/PredictiveInsights";
import { BehaviorAlerts } from "@/components/BehaviorAlerts";
import { Progress } from "@/components/ui/progress";
import { Pipeline, User, Lead } from "@/services/kommoApi";
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Target, 
  Brain,
  Activity,
  Timer,
  Zap
} from "lucide-react";

interface LeadBehaviorAnalysisProps {
  allLeads: Lead[];
  pipelines: Pipeline[];
  users: User[];
  loading: boolean;
}

interface BehaviorSegment {
  name: string;
  leads: Lead[];
  characteristics: string[];
  conversionRate: number;
  avgTimeToClose: number;
  color: string;
}

export const LeadBehaviorAnalysis = ({ 
  allLeads, 
  pipelines, 
  users, 
  loading 
}: LeadBehaviorAnalysisProps) => {
  console.log("LeadBehaviorAnalysis rendering:", { allLeads: allLeads?.length, pipelines: pipelines?.length, users: users?.length, loading });
  
  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [timeFrame, setTimeFrame] = useState<string>("30"); // days

  // Calculate behavioral metrics
  const behaviorMetrics = useMemo(() => {
    if (!allLeads || !allLeads.length) return null;

    const now = Date.now();
    const timeFrameMs = parseInt(timeFrame) * 24 * 60 * 60 * 1000;
    const startTime = now - timeFrameMs;

    // Filter leads by timeframe and selected filters - with null checks
    const filteredLeads = allLeads.filter(lead => {
      if (!lead || typeof lead.created_at !== 'number') return false;
      const leadTime = lead.created_at * 1000;
      if (leadTime < startTime) return false;
      if (selectedPipeline && lead.pipeline_id !== selectedPipeline) return false;
      if (selectedUser && lead.responsible_user_id !== selectedUser) return false;
      return true;
    });

    // Calculate dormant leads (no updates in last 7 days)
    const dormantThreshold = now - (7 * 24 * 60 * 60 * 1000);
    const dormantLeads = filteredLeads.filter(lead => 
      lead && 
      typeof lead.updated_at === 'number' && 
      (lead.updated_at * 1000) < dormantThreshold && 
      !lead.closed_at
    );

    // Calculate velocity score
    const activeLeads = filteredLeads.filter(lead => lead && !lead.closed_at);
    const totalVelocity = activeLeads.reduce((sum, lead) => {
      if (!lead || typeof lead.created_at !== 'number' || typeof lead.updated_at !== 'number') {
        return sum;
      }
      const daysSinceCreated = (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000);
      const daysSinceUpdate = (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
      return sum + (1 / Math.max(daysSinceUpdate, 1));
    }, 0);
    const avgVelocity = activeLeads.length > 0 ? totalVelocity / activeLeads.length : 0;

    // Calculate conversion probability
    const closedLeads = filteredLeads.filter(lead => lead && lead.closed_at);
    const wonLeads = closedLeads.filter(lead => lead && lead.status_id === 142); // Won status
    const conversionRate = closedLeads.length > 0 ? (wonLeads.length / closedLeads.length) * 100 : 0;

    // Find high-risk leads (old leads without recent activity)
    const highRiskThreshold = now - (14 * 24 * 60 * 60 * 1000);
    const highRiskLeads = activeLeads.filter(lead => 
      lead && 
      typeof lead.updated_at === 'number' && 
      (lead.updated_at * 1000) < highRiskThreshold
    );

    return {
      totalLeads: filteredLeads.length,
      activeLeads: activeLeads.length,
      dormantLeads: dormantLeads.length,
      highRiskLeads: highRiskLeads.length,
      avgVelocity: avgVelocity,
      conversionRate: conversionRate,
      avgTimeToClose: wonLeads.length > 0 ? wonLeads.reduce((sum, lead) => 
        sum + ((lead.closed_at! - lead.created_at) / (24 * 60 * 60)), 0
      ) / wonLeads.length : 0
    };
  }, [allLeads, selectedPipeline, selectedUser, timeFrame]);

  // Calculate behavioral segments
  const behaviorSegments = useMemo((): BehaviorSegment[] => {
    if (!allLeads || !allLeads.length) return [];

    const now = Date.now();
    const filteredLeads = allLeads.filter(lead => {
      if (!lead) return false;
      if (selectedPipeline && lead.pipeline_id !== selectedPipeline) return false;
      if (selectedUser && lead.responsible_user_id !== selectedUser) return false;
      return true;
    });

    // Segment by velocity
    const segments: BehaviorSegment[] = [];

    // Hot leads - recently created and frequently updated
    const hotLeads = filteredLeads.filter(lead => {
      if (!lead || typeof lead.created_at !== 'number') {
        return false;
      }
      const daysSinceCreated = (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000);
      const daysSinceUpdate = typeof lead.updated_at === 'number'
        ? (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000)
        : daysSinceCreated;
      
      return daysSinceCreated <= 30 && daysSinceUpdate <= 3 && !lead.closed_at;
    });

    // Warm leads - moderate activity
    const warmLeads = filteredLeads.filter(lead => {
      if (!lead || typeof lead.created_at !== 'number') {
        return false;
      }
      const daysSinceCreated = (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000);
      const daysSinceUpdate = typeof lead.updated_at === 'number'
        ? (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000)
        : daysSinceCreated;
      
      return daysSinceCreated <= 60 && daysSinceUpdate > 3 && daysSinceUpdate <= 14 && !lead.closed_at;
    });

    // Cold leads - low activity
    const coldLeads = filteredLeads.filter(lead => {
      if (!lead) {
        return false;
      }
      const daysSinceUpdate = typeof lead.updated_at === 'number'
        ? (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000)
        : typeof lead.created_at === 'number'
        ? (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000)
        : 999;
      
      return daysSinceUpdate > 14 && !lead.closed_at;
    });

    // Calculate conversion rates for each segment using historical data
    const calculateConversionRate = (segmentLeads: Lead[]) => {
      if (segmentLeads.length === 0) return 0;
      
      // Get all leads that were ever in this segment based on their characteristics
      // and check their final outcome
      const segmentLeadIds = segmentLeads.map(lead => lead.id);
      const historicalOutcomes = allLeads.filter(lead => 
        segmentLeadIds.includes(lead.id) && lead.closed_at
      );
      
      if (historicalOutcomes.length === 0) {
        // If no historical data, estimate based on segment activity level
        if (segmentLeads === hotLeads) return 75; // Hot leads typically convert well
        if (segmentLeads === warmLeads) return 45; // Warm leads moderate conversion
        if (segmentLeads === coldLeads) return 15; // Cold leads low conversion
        return 30; // Default fallback
      }
      
      const wonInSegment = historicalOutcomes.filter(lead => lead.status_id === 142);
      return (wonInSegment.length / historicalOutcomes.length) * 100;
    };

    segments.push({
      name: "Leads Quentes",
      leads: hotLeads,
      characteristics: ["Criados recentemente", "Atividade frequente", "Alta prioridade"],
      conversionRate: calculateConversionRate(hotLeads),
      avgTimeToClose: 0, // Will be calculated
      color: "hsl(var(--success))"
    });

    segments.push({
      name: "Leads Mornos", 
      leads: warmLeads,
      characteristics: ["Atividade moderada", "Acompanhamento regular", "Potencial médio"],
      conversionRate: calculateConversionRate(warmLeads),
      avgTimeToClose: 0,
      color: "hsl(var(--warning))"
    });

    segments.push({
      name: "Leads Frios",
      leads: coldLeads, 
      characteristics: ["Baixa atividade", "Necessita reativação", "Risco de perda"],
      conversionRate: calculateConversionRate(coldLeads),
      avgTimeToClose: 0,
      color: "hsl(var(--destructive))"
    });

    return segments;
  }, [allLeads, selectedPipeline, selectedUser]);

  if (loading) {
    console.log("LeadBehaviorAnalysis showing loading state");
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  console.log("LeadBehaviorAnalysis rendering main content");
  
  if (!allLeads || !pipelines || !users) {
    console.log("LeadBehaviorAnalysis: Missing required data");
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Dados não disponíveis</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifique se os dados foram carregados corretamente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análise Comportamental de Leads
          </CardTitle>
          <CardDescription>
            Insights avançados sobre o comportamento e padrões dos seus leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Pipeline</label>
              <Select 
                value={selectedPipeline?.toString() || "all"} 
                onValueChange={(value) => setSelectedPipeline(value === "all" ? null : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os pipelines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pipelines</SelectItem>
                  {pipelines.filter(p => p.id != null).map((pipeline) => (
                    <SelectItem key={pipeline.id} value={String(pipeline.id)}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Vendedor</label>
              <Select 
                value={selectedUser?.toString() || "all"} 
                onValueChange={(value) => setSelectedUser(value === "all" ? null : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {users.filter(u => u.id != null).map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={timeFrame} onValueChange={setTimeFrame}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Tabs for detailed analysis */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">Métricas Detalhadas</TabsTrigger>
          <TabsTrigger value="journey">Jornada dos Leads</TabsTrigger>
          <TabsTrigger value="insights">Insights Preditivos</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <BehaviorMetrics 
            allLeads={allLeads}
            pipelines={pipelines}
            users={users}
            selectedPipeline={selectedPipeline}
            selectedUser={selectedUser}
            timeFrame={timeFrame}
          />
        </TabsContent>

        <TabsContent value="journey">
          <LeadJourneyMap 
            allLeads={allLeads}
            pipelines={pipelines}
            selectedPipeline={selectedPipeline}
          />
        </TabsContent>

        <TabsContent value="insights">
          <PredictiveInsights 
            allLeads={allLeads}
            pipelines={pipelines}
            users={users}
            selectedPipeline={selectedPipeline}
            selectedUser={selectedUser}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};