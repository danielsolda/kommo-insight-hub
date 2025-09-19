import { useState, useEffect, useCallback, useMemo } from "react";
import { KommoApiService, Pipeline, Tag } from "@/services/kommoApi";
import { KommoAuthService } from "@/services/kommoAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocalCache } from "@/hooks/useLocalCache";
import { useDebouncedCallback } from "@/hooks/useDebounce";

// Interface for the raw API response
interface RawPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  _embedded: {
    statuses: Array<{
      id: number;
      name: string;
      sort: number;
      color: string;
    }>;
  };
}

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

interface GeneralStats {
  totalRevenue: number;
  activeLeads: number;
  conversionRate: number;
  totalCalls: number;
  revenueChange: string;
  leadsChange: string;
  conversionChange: string;
  callsChange: string;
  roi?: number;
  roiChange?: string;
}

interface InvestmentConfig {
  monthlyInvestment: number;
  roiGoal: number;
  monthlySalesGoal: number;
}

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

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// Granular loading states interface
interface LoadingStates {
  pipelines: boolean;
  stats: boolean;
  leads: boolean;
  users: boolean;
  customFields: boolean;
  pipelineStats: boolean;
  tags: boolean;
}

// Progress tracking interface
interface LoadingProgress {
  leads: { current: number; total: number; phase: string };
  unsorted: { current: number; total: number; phase: string };
}

export const useKommoApi = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null);
  
  // Granular loading states
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    pipelines: true,
    stats: true,
    leads: true,
    users: true,
    customFields: true,
    pipelineStats: false,
    tags: true
  });
  
  // Legacy loading state for backward compatibility
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Progress tracking
  const [progress, setProgress] = useState<LoadingProgress>({
    leads: { current: 0, total: 0, phase: 'Iniciando...' },
    unsorted: { current: 0, total: 0, phase: 'Iniciando...' }
  });
  
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [salesRanking, setSalesRanking] = useState<SalesRankingData[]>([]);
  const [rankingPipelineFilter, setRankingPipelineFilter] = useState<number | null>(null);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [salesChartPipelineFilter, setSalesChartPipelineFilter] = useState<number | null>(null);
  const [rankingDateRange, setRankingDateRangeState] = useState<DateRange>({
    startDate: null,
    endDate: null
  });
  const [investmentConfig, setInvestmentConfig] = useState<InvestmentConfig>(() => {
    const saved = localStorage.getItem('kommo-investment-config');
    return saved ? JSON.parse(saved) : { monthlyInvestment: 10000, roiGoal: 300, monthlySalesGoal: 50000 };
  });
  const { toast } = useToast();
  const cache = useLocalCache({ ttl: 5 * 60 * 1000, key: 'kommo-api' }); // 5 minutes cache

  // Helper to update specific loading state
  const updateLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  // All pipelines use status ID 142 for "Venda ganha" (closed won)
  const closedWonStatusIds = useMemo(() => {
    const statusIds = new Set<number>();
    statusIds.add(142); // Universal "Venda ganha" status ID
    console.log('🎯 Usando status ID 142 para "Venda ganha" (closed won)');
    return statusIds;
  }, []);

  // Memoized sales ranking calculation
  const memoizedSalesRanking = useMemo(() => {
    if (!users.length || !allLeads.length || !pipelines.length) {
      console.log('🔄 Ranking: Missing data - users:', users.length, 'leads:', allLeads.length, 'pipelines:', pipelines.length);
      return [];
    }

    // Use status ID 142 for "Venda Ganha" (consistent with sales evolution chart)
    const closedWonStatusId = 142;

    console.log('🏆 Ranking: Using closed won status ID:', closedWonStatusId);
    console.log('👥 Ranking: Total users available:', users.length);
    console.log('📋 Ranking: Total leads available:', allLeads.length);
    console.log('📋 Ranking: Sample user IDs:', users.slice(0, 3).map(u => `${u.name} (ID: ${u.id})`));
    console.log('📋 Ranking: Sample lead responsible_user_ids:', allLeads.slice(0, 5).map(l => l.responsible_user_id));

    const filterByPipeline = rankingPipelineFilter ? 
      (lead: any) => lead.pipeline_id === rankingPipelineFilter : 
      () => true;

    const filterByDateRange = (lead: any) => {
      if (!rankingDateRange.startDate || !rankingDateRange.endDate) return true;
      
      // Convert Unix timestamp (seconds) to milliseconds for Date constructor
      const leadDate = lead.closed_at ? new Date(lead.closed_at * 1000) : 
                      lead.updated_at ? new Date(lead.updated_at * 1000) : null;
      
      if (!leadDate) {
        console.log(`⚠️  Lead ${lead.id} has no valid date (closed_at or updated_at)`);
        return false;
      }
      
      return leadDate >= rankingDateRange.startDate && leadDate <= rankingDateRange.endDate;
    };

    console.log('🎯 Ranking: Pipeline filter:', rankingPipelineFilter);
    console.log('📅 Ranking: Date range:', rankingDateRange);

    // First, check how many leads have status 142
    const status142Leads = allLeads.filter(lead => lead.status_id === closedWonStatusId);
    console.log(`🔍 Debug: ${status142Leads.length} leads found with status 142`);
    
    // Check how many have responsible_user_id
    const status142LeadsWithUser = status142Leads.filter(lead => lead.responsible_user_id);
    console.log(`👤 Debug: ${status142LeadsWithUser.length} status 142 leads have responsible_user_id`);

    const ranking = users.map(user => {
      const userLeads = allLeads.filter(lead => 
        lead.responsible_user_id === user.id && 
        lead.status_id === closedWonStatusId &&
        filterByPipeline(lead) &&
        filterByDateRange(lead)
      );

      console.log(`👤 User ${user.name} (ID: ${user.id}): ${userLeads.length} closed won leads`);
      
      if (userLeads.length > 0) {
        console.log(`   💰 Sample lead prices: ${userLeads.slice(0, 3).map(l => l.price || 0).join(', ')}`);
        console.log(`   📅 Sample lead dates: ${userLeads.slice(0, 3).map(l => l.closed_at || l.updated_at || 'no date').join(', ')}`);
      }

      const totalSales = userLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
      const salesQuantity = userLeads.length;
      const monthlyAverage = totalSales / 12;

      return {
        userId: user.id,
        userName: user.name || 'Usuário sem nome',
        totalSales,
        salesQuantity,
        monthlyAverage,
        currentMonthSales: totalSales,
        currentMonthQuantity: salesQuantity
      };
    }).filter(user => user.salesQuantity > 0)
      .sort((a, b) => b.totalSales - a.totalSales);

    console.log('📊 Ranking final:', ranking.length, 'vendedores com vendas');
    
    if (ranking.length === 0) {
      console.log('⚠️  No ranking data - debugging info:');
      console.log('   - Total users:', users.length);
      console.log('   - Total leads:', allLeads.length);
      console.log('   - Leads with status 142:', allLeads.filter(l => l.status_id === 142).length);
      console.log('   - Leads with responsible_user_id:', allLeads.filter(l => l.responsible_user_id).length);
    }
    
    return ranking;
  }, [users, allLeads, pipelines, rankingPipelineFilter, rankingDateRange]);

  // Update sales ranking when memoized value changes
  useEffect(() => {
    setSalesRanking(memoizedSalesRanking);
  }, [memoizedSalesRanking]);

  // Memoized filtered sales data calculation
  const filteredSalesData = useMemo(() => {
    console.log(`🔄 Recalculando dados de vendas filtrados...`);
    console.log(`   📋 Pipeline filter: ${salesChartPipelineFilter}`);
    console.log(`   📊 Pipelines disponíveis: ${pipelines.length}`);
    console.log(`   📈 All leads disponíveis: ${allLeads.length}`);
    console.log(`   💰 Sales data base: ${salesData.length} meses`);
    
    if (!salesChartPipelineFilter || !pipelines.length || !allLeads.length) {
      console.log('📊 Gráfico de vendas: Sem filtro de pipeline ou dados insuficientes - retornando salesData original');
      return salesData;
    }

    // Use universal status ID 142 for "Venda ganha" (closed won)
    const selectedPipeline = pipelines.find(p => p.id === salesChartPipelineFilter);
    if (!selectedPipeline) {
      console.log(`❌ Pipeline com ID ${salesChartPipelineFilter} não encontrada`);
      return salesData;
    }

    console.log(`🎯 Filtrando gráfico de vendas:`);
    console.log(`   📋 Pipeline selecionada: ${selectedPipeline.name} (ID: ${salesChartPipelineFilter})`);
    console.log(`   🏆 Status "Venda ganha": ID 142`);

    // Filter leads by pipeline and closed won status (ID 142)
    const pipelineLeads = allLeads.filter(lead => 
      lead.pipeline_id === salesChartPipelineFilter && 
      lead.status_id === 142 &&
      lead.closed_at // Only leads with valid closed_at date
    );

    console.log(`📈 Resultado do filtro:`);
    console.log(`   📊 Total de leads formatados: ${allLeads.length}`);
    console.log(`   🎯 Leads da pipeline ${salesChartPipelineFilter}: ${allLeads.filter(lead => lead.pipeline_id === salesChartPipelineFilter).length}`);
    console.log(`   🏆 Leads com status 142: ${allLeads.filter(lead => lead.status_id === 142).length}`);
    console.log(`   ⏰ Leads com closed_at válido: ${allLeads.filter(lead => lead.closed_at).length}`);
    console.log(`   ✅ Leads filtrados finais: ${pipelineLeads.length}`);
    
    // Debug: Show detailed info about leads in the selected pipeline
    const pipelineAllLeads = allLeads.filter(lead => lead.pipeline_id === salesChartPipelineFilter);
    console.log(`   📋 Todos os leads da pipeline ${salesChartPipelineFilter}:`, pipelineAllLeads.map(lead => ({
      id: lead.id,
      status_id: lead.status_id,
      price: lead.price,
      closed_at: lead.closed_at ? new Date(lead.closed_at * 1000).toLocaleDateString('pt-BR') : null
    })).slice(0, 5));
    
    // Debug: Show some sample leads
    if (pipelineLeads.length > 0) {
      console.log(`   📝 Amostra de leads filtrados:`, pipelineLeads.slice(0, 3).map(lead => ({
        id: lead.id,
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,
        price: lead.price,
        closed_at: lead.closed_at ? new Date(lead.closed_at * 1000).toLocaleDateString('pt-BR') : null
      })));
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Recalculate monthly data for the selected pipeline using closed_at date
    const monthlyData = Array.from({ length: currentMonth + 1 }, (_, i) => {
      const monthName = new Date(currentYear, i, 1).toLocaleString('pt-BR', { month: 'short' });
      const monthLeads = pipelineLeads.filter(lead => {
        if (!lead.closed_at) return false;
        const leadDate = new Date(lead.closed_at * 1000);
        return leadDate.getFullYear() === currentYear && leadDate.getMonth() === i;
      });
      
      const monthRevenue = monthLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
      console.log(`     💰 Mês ${i + 1} (${monthName}): ${monthLeads.length} leads, receita: R$ ${monthRevenue.toLocaleString('pt-BR')}`);
      if (monthLeads.length > 0) {
        console.log(`        🔍 Amostra de leads do mês:`, monthLeads.slice(0, 2).map(lead => ({
          id: lead.id,
          price: lead.price,
          closed_at: lead.closed_at ? new Date(lead.closed_at * 1000).toLocaleDateString('pt-BR') : null
        })));
      }
      const monthTarget = investmentConfig.monthlySalesGoal;
      
      return {
        month: monthName,
        vendas: monthRevenue,
        meta: monthTarget,
        leads: monthLeads.length
      };
    });

    console.log(`📊 Dados mensais calculados para pipeline ${salesChartPipelineFilter}:`, monthlyData.map(m => ({
      month: m.month,
      vendas: m.vendas,
      leads: m.leads
    })));

    return monthlyData;
  }, [salesData, salesChartPipelineFilter, pipelines, allLeads]);

  // Memoized general stats with ROI calculation
  const memoizedGeneralStats = useMemo(() => {
    if (!generalStats) return null;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Calculate monthly revenue (simplified - could be more sophisticated)
    const monthlyRevenue = generalStats.totalRevenue; // Assuming this is monthly data
    const monthlyInvestment = investmentConfig.monthlyInvestment;
    
    let roi = 0;
    let roiChange = "+0%";
    
    if (monthlyInvestment > 0 && monthlyRevenue > 0) {
      roi = ((monthlyRevenue - monthlyInvestment) / monthlyInvestment) * 100;
      
      // Compare with goal for change indicator
      const goalDifference = roi - investmentConfig.roiGoal;
      roiChange = goalDifference >= 0 ? `+${goalDifference.toFixed(1)}%` : `${goalDifference.toFixed(1)}%`;
    }
    
    return {
      ...generalStats,
      roi,
      roiChange,
      // Add any heavy calculations here if needed
      averageLeadValue: generalStats.activeLeads > 0 ? 
        Math.round(generalStats.totalRevenue / generalStats.activeLeads) : 0,
      performanceScore: Math.min(100, Math.round(generalStats.conversionRate * 2))
    };
  }, [generalStats, investmentConfig]);

  // Debounced functions for performance
  const debouncedSetRankingPipeline = useDebouncedCallback((pipelineId: number | null) => {
    setRankingPipelineFilter(pipelineId);
  }, 300);

  const debouncedSetRankingDateRange = useDebouncedCallback((dateRange: DateRange) => {
    setRankingDateRangeState(dateRange);
  }, 500);

  // Progressive loading effect - Priority: Pipelines → Stats → Leads → Users → CustomFields
  useEffect(() => {
    const loadProgressively = async () => {
      try {
        // Phase 1: Load pipelines first (highest priority)
        await fetchPipelines();
        
        // Phase 2: Load general stats (second priority)
        setTimeout(() => fetchGeneralStats(), 100);
        
        // Phase 3: Load leads (third priority, slower)
        setTimeout(() => fetchAllLeads(), 500);
        
        // Phase 4: Load users and custom fields (lowest priority)
        setTimeout(() => fetchUsers(), 1000);
        setTimeout(() => fetchCustomFields(), 1500);
        setTimeout(() => fetchTags(), 2000);
      } catch (error) {
        console.error('Error in progressive loading:', error);
      }
    };

    loadProgressively();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchPipelineStats(selectedPipeline);
    }
  }, [selectedPipeline]);

  // Sales ranking is now handled by the memoized calculation

  const fetchPipelines = useCallback(async () => {
    updateLoadingState('pipelines', true);
    setError(null);
    
    try {
      const cachedPipelines = cache.getCache('pipelines') as Pipeline[] | null;
      if (cachedPipelines) {
        console.log('📦 Loading pipelines from cache');
        setPipelines(cachedPipelines);
        const mainPipeline = cachedPipelines.find((p: Pipeline) => p.is_main) || cachedPipelines[0];
        if (mainPipeline) {
          setSelectedPipeline(mainPipeline.id);
        }
        updateLoadingState('pipelines', false);
        return;
      }

      console.log('🔄 Fetching pipelines from API');
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const response = await apiService.getPipelines();
      const rawPipelines = response._embedded?.pipelines || [] as RawPipeline[];
      
      const transformedPipelines: Pipeline[] = rawPipelines.map(pipeline => ({
        id: pipeline.id,
        name: pipeline.name,
        sort: pipeline.sort,
        is_main: pipeline.is_main,
        statuses: pipeline._embedded?.statuses || []
      }));
      
      setPipelines(transformedPipelines);
      cache.setCache('pipelines', transformedPipelines, 10 * 60 * 1000);
      
      const mainPipeline = transformedPipelines.find(p => p.is_main) || transformedPipelines[0];
      if (mainPipeline) {
        setSelectedPipeline(mainPipeline.id);
      }
    } catch (err: any) {
      const errorMsg = `Erro ao carregar pipelines: ${err.message}`;
      setError(errorMsg);
      toast({
        title: "Erro ao Conectar com Kommo",
        description: err.message || 'Verifique sua configuração e conexão de internet.',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('pipelines', false);
    }
  }, [updateLoadingState, cache, toast]);

  const fetchPipelineStats = useCallback(async (pipelineId: number) => {
    updateLoadingState('pipelineStats', true);
    setError(null);
    
    try {
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      console.log(`🔍 Buscando todos os leads da pipeline ${pipelineId}...`);

      const [leadsResponse, unsortedResponse] = await Promise.all([
        apiService.getAllLeads({
          filter: { pipeline_id: pipelineId },
          onProgress: (count, page) => console.log(`📊 Pipeline ${pipelineId} - Leads: ${count} (página ${page})`)
        }).catch((err) => {
          console.error('Erro ao buscar leads da pipeline:', err);
          return { _embedded: { leads: [] } };
        }),
        apiService.getAllUnsortedLeads({
          filter: { pipeline_id: pipelineId },
          onProgress: (count, page) => console.log(`📊 Pipeline ${pipelineId} - Não organizados: ${count} (página ${page})`)
        }).catch((err) => {
          console.error('Erro ao buscar leads não organizados:', err);
          return { _embedded: { unsorted: [] } };
        })
      ]);

      const leads = leadsResponse._embedded?.leads || [];
      const unsortedLeads = unsortedResponse._embedded?.unsorted || [];
      const pipeline = pipelines.find(p => p.id === pipelineId);
      
      if (!pipeline) return;

      const statusStats = pipeline.statuses.map(status => {
        const statusLeads = leads.filter(lead => lead.status_id === status.id);
        const totalValue = statusLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
        
        return {
          id: status.id,
          name: status.name,
          count: statusLeads.length,
          value: totalValue,
          color: status.color,
        };
      });

      if (unsortedLeads.length > 0) {
        const unsortedValue = unsortedLeads.reduce((sum: number, lead: any) => {
          const leadValue = lead._embedded?.leads?.[0]?.price || 0;
          return sum + leadValue;
        }, 0);

        statusStats.unshift({
          id: -1,
          name: "Etapa de entrada",
          count: unsortedLeads.length,
          value: unsortedValue,
          color: "#c1c1c1",
        });
      }

      const stats: PipelineStats = {
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        statuses: statusStats,
      };

      setPipelineStats([stats]);
    } catch (err: any) {
      const errorMsg = `Erro ao carregar estatísticas: ${err.message}`;
      setError(errorMsg);
      toast({
        title: "Erro ao Carregar Dados",
        description: err.message || 'Não foi possível carregar as estatísticas da pipeline.',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('pipelineStats', false);
    }
  }, [updateLoadingState, pipelines, toast]);

  const fetchGeneralStats = useCallback(async () => {
    updateLoadingState('stats', true);
    
    try {
      const cachedStats = cache.getCache('generalStats') as GeneralStats | null;
      if (cachedStats) {
        console.log('📦 Loading general stats from cache');
        setGeneralStats(cachedStats);
        updateLoadingState('stats', false);
        return;
      }

      console.log('🔄 Fetching general stats from API');
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const [leadsResponse, pipelinesResponse] = await Promise.all([
        apiService.getAllLeads({
          onProgress: (count, page) => {
            setProgress(prev => ({
              ...prev,
              leads: { current: count, total: count, phase: `Carregando leads (página ${page})` }
            }));
          }
        }).catch(() => ({ _embedded: { leads: [] } })),
        apiService.getPipelines().catch(() => ({ _embedded: { pipelines: [] } }))
      ]);

      const allLeads = leadsResponse._embedded?.leads || [];
      const allPipelines = pipelinesResponse._embedded?.pipelines || [];
      
      // Use universal status ID 142 for "Venda ganha" (closed won)
      const closedWonStatusIds = new Set<number>();
      closedWonStatusIds.add(142);
      console.log('📊 Estatísticas gerais usando status ID 142 para "Venda ganha"');
      
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      
      const closedWonLeads = allLeads.filter(lead => closedWonStatusIds.has(lead.status_id));
      const activeLeads = allLeads.filter(lead => !closedWonStatusIds.has(lead.status_id));
      
      const currentMonthClosedWon = closedWonLeads.filter(lead => {
        const leadDate = new Date(lead.closed_at || lead.updated_at);
        return leadDate >= currentMonthStart && leadDate <= currentMonthEnd;
      });
      
      const previousMonthClosedWon = closedWonLeads.filter(lead => {
        const leadDate = new Date(lead.closed_at || lead.updated_at);
        return leadDate >= previousMonthStart && leadDate <= previousMonthEnd;
      });
      
      const totalRevenue = closedWonLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
      const currentRevenue = currentMonthClosedWon.reduce((sum, lead) => sum + (lead.price || 0), 0);
      const previousRevenue = previousMonthClosedWon.reduce((sum, lead) => sum + (lead.price || 0), 0);
      
      const conversionRate = allLeads.length > 0 ? (closedWonLeads.length / allLeads.length) * 100 : 0;
      
      const calculateChange = (current: number, previous: number): string => {
        if (previous === 0) return current > 0 ? "+100%" : "0%";
        const change = ((current - previous) / previous) * 100;
        return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
      };
      
      const stats: GeneralStats = {
        totalRevenue,
        activeLeads: activeLeads.length,
        conversionRate,
        totalCalls: 0,
        revenueChange: calculateChange(currentRevenue, previousRevenue),
        leadsChange: "+0%",
        conversionChange: "+0%",
        callsChange: "N/A"
      };

      setGeneralStats(stats);
      cache.setCache('generalStats', stats, 3 * 60 * 1000);
    } catch (err: any) {
      console.error('Error fetching general stats:', err);
    } finally {
      updateLoadingState('stats', false);
    }
  }, [updateLoadingState, cache, setProgress]);

  const fetchAllLeads = useCallback(async () => {
    updateLoadingState('leads', true);
    
    try {
      const cachedLeads = cache.getCache('allLeads') as any[] | null;
      const cachedSalesData = cache.getCache('salesData') as any[] | null;
      
      if (cachedLeads && cachedSalesData) {
        console.log('📦 Loading leads from cache');
        setAllLeads(cachedLeads);
        setSalesData(cachedSalesData);
        updateLoadingState('leads', false);
        return;
      }

      console.log('🔄 Fetching leads from API');
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const [leadsResponse, unsortedResponse] = await Promise.all([
        apiService.getAllLeads({ 
          with: ['contacts'],
          onProgress: (count, page) => {
            setProgress(prev => ({
              ...prev,
              leads: { current: count, total: count, phase: `Carregando leads (página ${page})` }
            }));
          }
        }).catch(() => ({ _embedded: { leads: [] } })),
        apiService.getAllUnsortedLeads({
          onProgress: (count, page) => {
            setProgress(prev => ({
              ...prev,
              unsorted: { current: count, total: count, phase: `Carregando não organizados (página ${page})` }
            }));
          }
        }).catch(() => ({ _embedded: { unsorted: [] } }))
      ]);

      const sortedLeads = leadsResponse._embedded?.leads || [];
      const unsortedLeads = unsortedResponse._embedded?.unsorted || [];
      
      const formattedLeads = [
        ...sortedLeads.map(lead => ({
          id: lead.id,
          name: lead.name || 'Lead sem nome',
          company: lead._embedded?.companies?.[0]?.name || 'Empresa não informada',
          email: lead._embedded?.contacts?.[0]?.custom_fields?.find((field: any) => field.field_name === 'EMAIL')?.values?.[0]?.value || 'Email não informado',
          phone: lead._embedded?.contacts?.[0]?.custom_fields?.find((field: any) => field.field_name === 'PHONE')?.values?.[0]?.value || 'Telefone não informado',
          stage: pipelines.find(p => p.id === lead.pipeline_id)?.statuses?.find(s => s.id === lead.status_id)?.name || 'Estágio não definido',
          value: lead.price || 0,
          price: lead.price || 0, // Add price field for consistency
          lastContact: lead.updated_at ? new Date(lead.updated_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          closed_at: lead.closed_at, // Preserve closed_at timestamp
          priority: lead.price > 30000 ? 'high' : lead.price > 15000 ? 'medium' : 'low',
          source: 'Kommo CRM',
          responsible_user_id: lead.responsible_user_id,
          pipeline_id: lead.pipeline_id,
          status_id: lead.status_id,
          custom_fields_values: lead.custom_fields_values,
          status_name: pipelines.find(p => p.id === lead.pipeline_id)?.statuses?.find(s => s.id === lead.status_id)?.name || 'Status desconhecido',
        })),
        ...unsortedLeads.map((lead: any) => ({
          id: `unsorted-${lead.uid}`,
          name: lead.metadata?.client?.name || lead.metadata?.from || 'Lead sem nome',
          company: 'Empresa não informada',
          email: 'Email não informado',
          phone: 'Telefone não informado', 
          stage: 'Etapa de entrada',
          value: lead._embedded?.leads?.[0]?.price || 0,
          price: lead._embedded?.leads?.[0]?.price || 0, // Add price field for consistency
          lastContact: lead.created_at ? new Date(lead.created_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          closed_at: null, // Unsorted leads don't have closed_at
          priority: 'medium',
          source: lead.metadata?.source_name || 'Kommo CRM',
          responsible_user_id: lead._embedded?.leads?.[0]?.responsible_user_id || null,
          pipeline_id: lead.pipeline_id || null,
          status_id: null, // Unsorted leads don't have status_id yet
          custom_fields_values: lead._embedded?.leads?.[0]?.custom_fields_values || [],
          status_name: 'Etapa de entrada',
        }))
      ];

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      const monthlyData = Array.from({ length: currentMonth + 1 }, (_, i) => {
        const monthName = new Date(currentYear, i, 1).toLocaleString('pt-BR', { month: 'short' });
        // Filter only closed won leads (status 142) with valid closed_at date
        const monthLeads = sortedLeads.filter(lead => {
          if (!lead.closed_at || lead.status_id !== 142) return false;
          const leadDate = new Date(lead.closed_at * 1000);
          return leadDate.getFullYear() === currentYear && leadDate.getMonth() === i;
        });
        
        const monthRevenue = monthLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
        // Get the configured monthly sales goal from localStorage
        const investmentConfig = JSON.parse(localStorage.getItem('kommo-investment-config') || '{"monthlySalesGoal": 0}');
        const monthTarget = investmentConfig.monthlySalesGoal || 0;
        
        return {
          month: monthName,
          vendas: monthRevenue,
          meta: monthTarget,
          leads: monthLeads.length
        };
      });

      setAllLeads(formattedLeads);
      setSalesData(monthlyData);

      cache.setCache('allLeads', formattedLeads, 5 * 60 * 1000);
      cache.setCache('salesData', monthlyData, 5 * 60 * 1000);

      console.log('✅ Leads loading completed:', {
        total: formattedLeads.length,
        sorted: sortedLeads.length,
        unsorted: unsortedLeads.length,
        sampleFormattedLead: formattedLeads[0] ? {
          id: formattedLeads[0].id,
          pipeline_id: formattedLeads[0].pipeline_id,
          status_id: formattedLeads[0].status_id,
          price: formattedLeads[0].price,
          value: formattedLeads[0].value,
          closed_at: formattedLeads[0].closed_at
        } : null,
        closedWonLeads: formattedLeads.filter(lead => lead.status_id === 142 && lead.closed_at).length
      });
    } catch (err: any) {
      console.error('Error fetching leads:', err);
    } finally {
      updateLoadingState('leads', false);
    }
  }, [updateLoadingState, cache, setProgress, pipelines]);

  const fetchUsers = useCallback(async () => {
    updateLoadingState('users', true);
    
    try {
      const cachedUsers = cache.getCache('users') as any[] | null;
      if (cachedUsers) {
        console.log('📦 Loading users from cache');
        setUsers(cachedUsers);
        updateLoadingState('users', false);
        return;
      }

      console.log('🔄 Fetching users from API');
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const response = await apiService.getAllUsers();
      const users = response._embedded?.users || [];
      setUsers(users);
      cache.setCache('users', users, 10 * 60 * 1000);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      updateLoadingState('users', false);
    }
  }, [updateLoadingState, cache]);

  const fetchCustomFields = useCallback(async () => {
    updateLoadingState('customFields', true);
    
    try {
      const cachedFields = cache.getCache('customFields') as any[] | null;
      if (cachedFields) {
        console.log('📦 Loading custom fields from cache');
        setCustomFields(cachedFields);
        updateLoadingState('customFields', false);
        return;
      }

      console.log('🔄 Buscando campos personalizados...');
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const response = await apiService.getCustomFields();
      const fields = response._embedded?.custom_fields || [];
      setCustomFields(fields);
      cache.setCache('customFields', fields, 15 * 60 * 1000);
    } catch (err: any) {
      console.error('❌ Erro ao buscar campos personalizados:', err);
      setCustomFields([]);
    } finally {
      updateLoadingState('customFields', false);
    }
  }, [updateLoadingState, cache]);

  const fetchTags = useCallback(async () => {
    updateLoadingState('tags', true);
    
    try {
      const cachedTags = cache.getCache('tags') as Tag[] | null;
      if (cachedTags) {
        console.log('📦 Loading tags from cache');
        setTags(cachedTags);
        updateLoadingState('tags', false);
        return;
      }

      console.log('🔄 Buscando tags...');
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const response = await apiService.getTags();
      const tags = response._embedded?.tags || [];
      setTags(tags);
      cache.setCache('tags', tags, 15 * 60 * 1000);
    } catch (err: any) {
      console.error('❌ Erro ao buscar tags:', err);
      setTags([]);
    } finally {
      updateLoadingState('tags', false);
    }
  }, [updateLoadingState, cache]);

  // Sales ranking calculation is now handled by memoized version above

  const refreshData = useCallback(async () => {
    cache.clearCache();
    await Promise.all([
      fetchPipelines(),
      fetchGeneralStats(),
      fetchAllLeads(),
      fetchUsers(),
      fetchCustomFields(),
      fetchTags()
    ]);
  }, [cache, fetchPipelines, fetchGeneralStats, fetchAllLeads, fetchUsers, fetchCustomFields, fetchTags]);

  // Investment config handler
  const updateInvestmentConfig = useCallback((config: InvestmentConfig) => {
    setInvestmentConfig(config);
    localStorage.setItem('kommo-investment-config', JSON.stringify(config));
  }, []);

  return {
    pipelines,
    pipelineStats: pipelineStats.find(p => p.pipelineId === selectedPipeline) || null,
    selectedPipeline,
    setSelectedPipeline,
    loading: Object.values(loadingStates).some(state => state),
    loadingStates,
    progress,
    error,
    refreshData,
    generalStats: memoizedGeneralStats,
    allLeads,
    salesData: filteredSalesData,
    salesChartPipelineFilter,
    setSalesChartPipelineFilter,
    users,
    salesRanking,
    setRankingPipeline: debouncedSetRankingPipeline,
    setRankingDateRange: debouncedSetRankingDateRange,
    rankingDateRange,
    investmentConfig,
    updateInvestmentConfig,
    calculateSalesRanking: useCallback(async () => {
      console.log('🔄 Sales ranking calculation triggered - forcing data refresh');
      
      // Clear cache to force fresh data
      cache.clearCache('users');
      cache.clearCache('leads');
      
      console.log('🧹 Cache cleared - forcing fresh data fetch');
      console.log('📊 Current data state before refresh:');
      console.log(`   👥 Users: ${users.length}`);
      console.log(`   📋 Leads: ${allLeads.length}`);
      console.log(`   🏆 Current ranking: ${salesRanking.length} vendedores`);
      
      // Trigger fresh data fetch
      await Promise.all([
        fetchUsers(),
        fetchAllLeads()
      ]);
      
      console.log('✅ Debug calculation completed - check memoized ranking for updates');
      
      return new Promise(resolve => {
        // Give time for memoized calculation to update
        setTimeout(resolve, 100);
      });
    }, [users, allLeads, salesRanking, cache]),
    customFields,
    tags,
  };
};