import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Settings, Users, TrendingUp, DollarSign, Target, RefreshCw, LogOut, BookOpen, Crown } from "lucide-react";
import { MetricsCards } from "@/components/MetricsCards";
import { MetricsSkeleton } from "@/components/ui/MetricsSkeleton";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { PipelineChart } from "@/components/PipelineChart";
import { LeadsTable } from "@/components/LeadsTable";
import { SalesChart } from "@/components/SalesChart";
import { SalesRanking } from "@/components/SalesRanking";
import { CustomFieldAnalysis } from "@/components/CustomFieldAnalysis";
import { 
  LazyPipelineChart, 
  LazyLeadsTable, 
  LazySalesChart, 
  LazyCustomFieldAnalysis,
  LazySalesRanking 
} from "@/components/LazyComponents";
import { NomenclaturesModal } from "@/components/NomenclaturesModal";
import { InvestmentSettingsModal } from "@/components/InvestmentSettingsModal";
import { useToast } from "@/hooks/use-toast";
import { useKommoApi } from "@/hooks/useKommoApi";
import { APP_VERSION } from "@/version";

interface DashboardProps {
  config: any;
  onReset: () => void;
}

export const Dashboard = ({ config, onReset }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [nomenclaturesOpen, setNomenclaturesOpen] = useState(false);
  const { toast } = useToast();
  const kommoApi = useKommoApi();

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await kommoApi.refreshData();
      setLastUpdate(new Date());
      toast({
        title: "Dados atualizados!",
        description: "Os dados foram sincronizados com a Kommo.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível sincronizar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall progress for display
  const calculateProgress = () => {
    const states = kommoApi.loadingStates;
    const total = Object.keys(states).length;
    const completed = Object.values(states).filter(state => !state).length;
    return Math.round((completed / total) * 100);
  };

  const isAnyLoading = kommoApi.loading;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Kommo Insight Hub</h1>
                <p className="text-sm text-muted-foreground">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')} • {APP_VERSION.split('T')[0].replace('build: ', 'v')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading || isAnyLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${(loading || isAnyLoading) ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <InvestmentSettingsModal 
                config={kommoApi.investmentConfig}
                onConfigChange={kommoApi.updateInvestmentConfig}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNomenclaturesOpen(true)}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Nomenclaturas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Progress bar for initial loading */}
        {isAnyLoading && (
          <div className="mb-6">
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Carregando dados...</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {kommoApi.progress.leads.phase}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-muted/30">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="pipelines" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Pipelines
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {kommoApi.loadingStates.stats ? (
              <MetricsSkeleton />
            ) : (
              <MetricsCards generalStats={kommoApi.generalStats} loading={kommoApi.loadingStates.stats} />
            )}
            
            <div className="grid lg:grid-cols-2 gap-6">
              {kommoApi.loadingStates.pipelineStats ? (
                <ChartSkeleton title="Pipeline" />
              ) : (
                <PipelineChart pipelineStats={kommoApi.pipelineStats} loading={kommoApi.loadingStates.pipelineStats} />
              )}
              
              <div className="space-y-4">
                <Card className="bg-gradient-card border-border/50 shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Filtro de Vendas</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select 
                      value={kommoApi.salesChartPipelineFilter?.toString() || "all"} 
                      onValueChange={(value) => kommoApi.setSalesChartPipelineFilter(value === "all" ? null : Number(value))}
                      disabled={kommoApi.loadingStates.pipelines}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma pipeline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as pipelines</SelectItem>
                        {kommoApi.pipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                            {pipeline.name} {pipeline.is_main && "(Principal)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
                
                {kommoApi.loadingStates.leads ? (
                  <ChartSkeleton title="Vendas" />
                ) : (
                  <SalesChart 
                    salesData={kommoApi.salesData} 
                    loading={kommoApi.loadingStates.leads}
                    pipelineName={kommoApi.salesChartPipelineFilter ? 
                      kommoApi.pipelines.find(p => p.id === kommoApi.salesChartPipelineFilter)?.name : 
                      undefined
                    }
                  />
                )}
              </div>
            </div>
            
            <Suspense fallback={<ChartSkeleton title="Análise de Campos Personalizados" height="h-64" />}>
              {kommoApi.loadingStates.customFields ? (
                <ChartSkeleton title="Análise de Campos Personalizados" height="h-64" />
              ) : (
                <LazyCustomFieldAnalysis 
                  customFields={kommoApi.customFields}
                  allLeads={kommoApi.allLeads}
                  pipelines={kommoApi.pipelines}
                  loading={kommoApi.loadingStates.customFields}
                />
              )}
            </Suspense>
            
          </TabsContent>

          <TabsContent value="pipelines" className="space-y-6">
            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardHeader>
                <CardTitle>Selecionar Pipeline</CardTitle>
                <CardDescription>
                  Escolha o pipeline para visualizar as estatísticas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select 
                  value={kommoApi.selectedPipeline?.toString()} 
                  onValueChange={(value) => kommoApi.setSelectedPipeline(Number(value))}
                  disabled={kommoApi.loadingStates.pipelines}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {kommoApi.pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                        {pipeline.name} {pipeline.is_main && "(Principal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            
            {kommoApi.selectedPipeline && (
              <Suspense fallback={<ChartSkeleton title="Estatísticas do Pipeline" />}>
                {kommoApi.loadingStates.pipelineStats ? (
                  <ChartSkeleton title="Estatísticas do Pipeline" />
                ) : (
                  <LazyPipelineChart pipelineStats={kommoApi.pipelineStats} loading={kommoApi.loadingStates.pipelineStats} />
                )}
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <Suspense fallback={<TableSkeleton title="Tabela de Leads" rows={10} columns={8} />}>
              {kommoApi.loadingStates.leads ? (
                <TableSkeleton title="Tabela de Leads" rows={10} columns={8} />
              ) : (
                <LazyLeadsTable leads={kommoApi.allLeads} loading={kommoApi.loadingStates.leads} />
              )}
            </Suspense>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Suspense fallback={<ChartSkeleton title="Vendas Mensais" />}>
                {kommoApi.loadingStates.leads ? (
                  <ChartSkeleton title="Vendas Mensais" />
                ) : (
                  <LazySalesChart salesData={kommoApi.salesData} loading={kommoApi.loadingStates.leads} />
                )}
              </Suspense>
              
              <Card className="bg-gradient-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>Métricas de Vendas</CardTitle>
                  <CardDescription>
                    Indicadores de performance de vendas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span>Taxa de Fechamento</span>
                      <span className="font-semibold text-success">
                        {kommoApi.loadingStates.stats ? "..." : kommoApi.generalStats ? `${kommoApi.generalStats.conversionRate.toFixed(1)}%` : "0%"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span>Ticket Médio</span>
                      <span className="font-semibold">
                        {kommoApi.loadingStates.stats ? "..." : kommoApi.generalStats && kommoApi.generalStats.activeLeads > 0 
                          ? `R$ ${Math.floor(kommoApi.generalStats.totalRevenue / kommoApi.generalStats.activeLeads).toLocaleString()}` 
                          : "R$ 0"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span>Ciclo de Vendas</span>
                      <span className="font-semibold">Estimado: 18 dias</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>ROI</span>
                      <span className={`font-semibold ${kommoApi.generalStats?.roi && kommoApi.generalStats.roi >= kommoApi.investmentConfig.roiGoal ? 'text-success' : 'text-warning'}`}>
                        {kommoApi.loadingStates.stats ? "..." : kommoApi.generalStats?.roi ? `${kommoApi.generalStats.roi.toFixed(1)}%` : "0%"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="space-y-6">
            <Suspense fallback={<TableSkeleton title="Ranking de Vendas" rows={8} columns={5} />}>
              {kommoApi.loadingStates.users || kommoApi.loadingStates.leads ? (
                <TableSkeleton title="Ranking de Vendas" rows={8} columns={5} />
              ) : (
                <LazySalesRanking 
                  salesRanking={kommoApi.salesRanking} 
                  loading={kommoApi.loadingStates.users || kommoApi.loadingStates.leads}
                  pipelines={kommoApi.pipelines}
                  onPipelineChange={kommoApi.setRankingPipeline}
                  dateRange={kommoApi.rankingDateRange}
                  onDateRangeChange={kommoApi.setRankingDateRange}
                />
              )}
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <NomenclaturesModal 
        open={nomenclaturesOpen} 
        onOpenChange={setNomenclaturesOpen} 
      />
    </div>
  );
};