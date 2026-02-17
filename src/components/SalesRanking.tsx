import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Crown, TrendingUp, TrendingDown, Users, DollarSign, Filter, Calendar as CalendarIcon, Bug, Eye, EyeOff, RefreshCw, Database, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useKommoApi } from "@/hooks/useKommoApi";
import { SellerAvatar } from "@/components/SellerAvatar";

interface SalesRankingData {
  userId: number;
  userName: string;
  totalSales: number;
  salesQuantity: number;
  monthlyAverage: number;
  currentMonthSales: number;
  currentMonthQuantity: number;
  avatarUrl?: string;
}

interface Pipeline {
  id: number;
  name: string;
  is_main: boolean;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface SalesRankingProps {
  salesRanking: SalesRankingData[];
  loading: boolean;
  pipelines: Pipeline[];
  onPipelineChange: (pipelineId: number | null) => void;
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
}

export const SalesRanking = ({ salesRanking, loading, pipelines, onPipelineChange, dateRange, onDateRangeChange }: SalesRankingProps) => {
  console.log('🔍 SalesRanking component received:', { 
    salesRankingLength: salesRanking.length, 
    loading, 
    pipelinesLength: pipelines.length 
  });
  
  const [selectedPipeline, setSelectedPipeline] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all-time");
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [lastCalculationTime, setLastCalculationTime] = useState<Date | null>(null);
  
  // Sync initial date range to match "all-time" filter
  useEffect(() => {
    if (dateFilter === "all-time") {
      onDateRangeChange({ startDate: null, endDate: null });
    }
  }, []);
  
  const { calculateSalesRanking, users, allLeads } = useKommoApi();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePipelineChange = (value: string) => {
    setSelectedPipeline(value);
    if (value === "all") {
      onPipelineChange(null);
    } else {
      onPipelineChange(Number(value));
    }
  };

  // Handle debug mode toggle
  const handleDebugToggle = async () => {
    setDebugMode(!debugMode);
    
    if (!debugMode) {
      // Entering debug mode - trigger recalculation with visual feedback
      setIsRecalculating(true);
      console.log('🐛 Debug mode activated - forcing data recalculation');
      
      try {
        await calculateSalesRanking();
        setLastCalculationTime(new Date());
        
        // Log detailed debug information
        console.log('📊 Debug Info - Detailed Analysis:');
        console.log(`   👥 Total users: ${users?.length || 0}`);
        console.log(`   📋 Total leads: ${allLeads?.length || 0}`);
        console.log(`   🏆 Leads with status 142 (Venda ganha): ${allLeads?.filter(l => l.status_id === 142).length || 0}`);
        console.log(`   👤 Leads with responsible_user_id: ${allLeads?.filter(l => l.responsible_user_id).length || 0}`);
        console.log(`   🎯 Pipeline filter: ${selectedPipeline === "all" ? "Todas" : selectedPipeline}`);
        console.log(`   📅 Date filter: ${dateFilter}`);
        console.log(`   📊 Current ranking results: ${salesRanking?.length || 0} vendedores`);
        
        if (salesRanking?.length > 0) {
          console.log('   🏆 Top 3 vendedores:', salesRanking.slice(0, 3).map(s => ({
            nome: s.userName,
            vendas: s.totalSales,
            quantidade: s.salesQuantity
          })));
        }
      } catch (error) {
        console.error('❌ Error during debug recalculation:', error);
      } finally {
        setIsRecalculating(false);
      }
    }
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    const now = new Date();
    
    switch (value) {
      case "current-month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        onDateRangeChange({ startDate: startOfMonth, endDate: endOfMonth });
        break;
      case "last-30-days":
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        onDateRangeChange({ startDate: last30Days, endDate: now });
        break;
      case "last-3-months":
        const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        onDateRangeChange({ startDate: last3Months, endDate: now });
        break;
      case "all-time":
        onDateRangeChange({ startDate: null, endDate: null });
        break;
      case "custom":
        // Keep current dateRange for custom selection
        break;
    }
  };

  const handleCustomDateChange = (field: 'start' | 'end', date: Date | undefined) => {
    if (dateFilter === 'custom') {
      onDateRangeChange({
        ...dateRange,
        [field === 'start' ? 'startDate' : 'endDate']: date || null
      });
    }
  };

  const getPeriodDescription = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return "Todas as vendas";
    }
    
    const start = format(dateRange.startDate, "dd/MM/yyyy", { locale: ptBR });
    const end = format(dateRange.endDate, "dd/MM/yyyy", { locale: ptBR });
    
    if (dateFilter === "current-month") {
      return "Vendas do mês atual";
    } else if (dateFilter === "last-30-days") {
      return "Últimos 30 dias";
    } else if (dateFilter === "last-3-months") {
      return "Últimos 3 meses";
    } else {
      return `Período: ${start} - ${end}`;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Ranking de Vendedores
              </CardTitle>
              <CardDescription>
                {getPeriodDescription()}
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border/30">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!salesRanking.length) {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Ranking de Vendedores
              </CardTitle>
              <CardDescription>
                {getPeriodDescription()}
              </CardDescription>
            </div>
      </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum vendedor com vendas encontrado</p>
            <p className="text-sm">Verifique se há leads associados aos usuários</p>
          </div>
        </CardContent>
      </Card>
    );
  }

    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Ranking de Vendedores
              </CardTitle>
              <CardDescription>
                {getPeriodDescription()}
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          {/* Debug Information */}
          {debugMode && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-orange-600" />
                  <h3 className="font-medium text-orange-800">Análise Detalhada dos Dados</h3>
                </div>
                {lastCalculationTime && (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <Clock className="h-3 w-3" />
                    Atualizado: {lastCalculationTime.toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                <div className="bg-white/60 p-3 rounded border border-orange-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <strong className="text-orange-700">Dados Base</strong>
                  </div>
                  <ul className="space-y-1 text-orange-600">
                    <li>👥 Usuários: <span className="font-medium">{users?.length || 0}</span></li>
                    <li>📋 Total Leads: <span className="font-medium">{allLeads?.length || 0}</span></li>
                    <li>🔄 Pipelines: <span className="font-medium">{pipelines?.length || 0}</span></li>
                  </ul>
                </div>
                
                <div className="bg-white/60 p-3 rounded border border-orange-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <strong className="text-orange-700">Leads Qualificados</strong>
                  </div>
                  <ul className="space-y-1 text-orange-600">
                    <li>🏆 Status "Venda ganha" (142): <span className="font-medium text-green-700">{allLeads?.filter(l => l.status_id === 142).length || 0}</span></li>
                    <li>👤 Com responsável: <span className="font-medium">{allLeads?.filter(l => l.responsible_user_id).length || 0}</span></li>
                    <li>💰 Com valor: <span className="font-medium">{allLeads?.filter(l => l.price && l.price > 0).length || 0}</span></li>
                  </ul>
                </div>

                <div className="bg-white/60 p-3 rounded border border-orange-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4 text-purple-600" />
                    <strong className="text-orange-700">Filtros Aplicados</strong>
                  </div>
                  <ul className="space-y-1 text-orange-600">
                    <li>🎯 Pipeline: <span className="font-medium">{selectedPipeline !== "all" ? `ID ${selectedPipeline}` : 'Todas'}</span></li>
                    <li>📅 Data: <span className="font-medium">{dateFilter}</span></li>
                    <li>📊 Período: <span className="font-medium text-xs">{getPeriodDescription()}</span></li>
                  </ul>
                </div>

                <div className="bg-white/60 p-3 rounded border border-orange-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <strong className="text-orange-700">Resultado Final</strong>
                  </div>
                  <ul className="space-y-1 text-orange-600">
                    <li>🏆 Vendedores Ativos: <span className="font-medium text-green-700">{salesRanking?.length || 0}</span></li>
                    <li>💰 Receita Total: <span className="font-medium">{formatCurrency(salesRanking?.reduce((sum, s) => sum + s.totalSales, 0) || 0)}</span></li>
                    <li>📊 Status: <span className="font-medium">{loading ? 'Carregando...' : isRecalculating ? 'Calculando...' : 'Pronto'}</span></li>
                  </ul>
                </div>
              </div>

              {/* Top Performers Preview */}
              {salesRanking && salesRanking.length > 0 && (
                <div className="bg-white/60 p-3 rounded border border-orange-200/50 mb-3">
                  <strong className="text-orange-700 text-sm">🏆 Top 3 Vendedores:</strong>
                  <div className="mt-2 space-y-1">
                    {salesRanking.slice(0, 3).map((seller, idx) => (
                      <div key={seller.userId} className="flex justify-between text-xs text-orange-600">
                        <span>{idx + 1}. {seller.userName}</span>
                        <span className="font-medium">{formatCurrency(seller.totalSales)} ({seller.salesQuantity} vendas)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded text-orange-700">
                  <span>💡</span>
                  <strong>Console:</strong> Verifique o console (F12) para logs detalhados
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-blue-700">
                  <span>🔄</span>
                  <strong>Cache:</strong> Dados atualizados a cada 5 minutos
                </div>
                {isRecalculating && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded text-yellow-700">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <strong>Recalculando...</strong>
                  </div>
                )}
              </div>
            </div>
          )}

        <div className="space-y-4">
          {salesRanking.slice(0, 10).map((seller, index) => {
            const isCurrentMonthBetter = seller.currentMonthSales >= seller.monthlyAverage;
            const rank = index + 1;

            return (
              <div key={seller.userId} className="flex items-center gap-4 p-4 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <SellerAvatar 
                    userName={seller.userName}
                    avatarUrl={seller.avatarUrl}
                    rank={rank}
                    size="md"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {index === 0 ? (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {rank}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">{seller.userName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {seller.salesQuantity} vendas totais
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Vendas</p>
                    <p className="font-bold text-primary">{formatCurrency(seller.totalSales)}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Média Mensal</p>
                    <p className="font-semibold">{formatCurrency(seller.monthlyAverage)}</p>
                  </div>
                  
                  <div className="hidden lg:block">
                    <p className="text-muted-foreground">Mês Atual</p>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold">{formatCurrency(seller.currentMonthSales)}</p>
                      {isCurrentMonthBetter ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge 
                    variant={index === 0 ? "default" : "secondary"}
                    className={index === 0 ? "bg-gradient-primary text-white" : ""}
                  >
                    {seller.currentMonthQuantity} este mês
                  </Badge>
                </div>
                
                {/* Debug Info for Each Seller */}
                {debugMode && (
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-50 rounded w-full">
                    <div className="grid grid-cols-2 gap-2">
                      <span>ID do Usuário: {seller.userId}</span>
                      <span>Vendas Totais: {seller.salesQuantity}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {salesRanking.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {debugMode ? (
              <div className="space-y-2">
                <p>🔍 <strong>Debug Mode:</strong> Nenhum vendedor encontrado</p>
                <p className="text-sm">Verifique o console para logs detalhados</p>
                <p className="text-xs">Dados: {users?.length || 0} usuários, {allLeads?.length || 0} leads, {pipelines?.length || 0} pipelines</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>📊 Nenhum vendedor com vendas encontrado no período selecionado</p>
                <p className="text-sm">Ative o modo Debug para mais informações</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};