import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Settings, Users, TrendingUp, DollarSign, Target, RefreshCw, LogOut } from "lucide-react";
import { MetricsCards } from "@/components/MetricsCards";
import { PipelineChart } from "@/components/PipelineChart";
import { LeadsTable } from "@/components/LeadsTable";
import { SalesChart } from "@/components/SalesChart";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  config: any;
  onReset: () => void;
}

export const Dashboard = ({ config, onReset }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { toast } = useToast();

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simular carregamento de dados
      await new Promise(resolve => setTimeout(resolve, 1000));
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
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted/30">
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
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <MetricsCards />
            <div className="grid lg:grid-cols-2 gap-6">
              <PipelineChart />
              <SalesChart />
            </div>
          </TabsContent>

          <TabsContent value="pipelines" className="space-y-6">
            <PipelineChart />
            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardHeader>
                <CardTitle>Pipeline de Vendas</CardTitle>
                <CardDescription>
                  Análise detalhada do seu pipeline de vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Dados detalhados do pipeline em desenvolvimento...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <LeadsTable />
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <SalesChart />
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
                      <span>Taxa de Conversão</span>
                      <span className="font-semibold text-success">23.5%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span>Ticket Médio</span>
                      <span className="font-semibold">R$ 4.250</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span>Ciclo de Vendas</span>
                      <span className="font-semibold">18 dias</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span>ROI</span>
                      <span className="font-semibold text-success">312%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};