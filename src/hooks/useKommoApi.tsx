import { useState, useEffect, useCallback, useMemo } from "react";
import { KommoApiService, Pipeline } from "@/services/kommoApi";
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
}

interface SalesRankingData {
  userId: number;
  userName: string;
  totalSales: number;
  salesQuantity: number;
  monthlyAverage: number;
  currentMonthSales: number;
  currentMonthQuantity: number;
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
}

// Progress tracking interface
interface LoadingProgress {
  leads: { current: number; total: number; phase: string };
  unsorted: { current: number; total: number; phase: string };
}

export default function useKommoApi() {
  // Novo estado para progresso da análise de integridade
  const [dataIntegrityProgress, setDataIntegrityProgress] = useState<{
    status: string;
    progress: number;
  }>({ status: '', progress: 0 });

  // Estados existentes
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
    pipelineStats: false
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
  const [rankingDateRange, setRankingDateRangeState] = useState<DateRange>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: startOfMonth, endDate: endOfMonth };
  });
  
  // Novos estados para integridade de dados
  const [dataIntegrity, setDataIntegrity] = useState<any>(null);
  const [leadsIntegrity, setLeadsIntegrity] = useState<any>(null);
  const [unsortedIntegrity, setUnsortedIntegrity] = useState<any>(null);
  const { toast } = useToast();
  const cache = useLocalCache({ ttl: 5 * 60 * 1000, key: 'kommo-api' }); // 5 minutes cache

  // Helper to update specific loading state
  const updateLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  // Memoized closed won status IDs calculation (global - for all pipelines)
  const closedWonStatusIds = useMemo(() => {
    const statusIds = new Set<number>();
    pipelines.forEach(pipeline => {
      pipeline.statuses.forEach(status => {
        const statusName = status.name.toLowerCase();
        if ((statusName.includes('fechado') || 
             statusName.includes('ganho') || 
             statusName.includes('won') || 
             statusName.includes('closed') ||
             statusName.includes('venda') ||
             statusName.includes('concluído') ||
             statusName.includes('finalizado')) &&
            !statusName.includes('lost') && 
            !statusName.includes('perdido') && 
            !statusName.includes('perdida')) {
          statusIds.add(status.id);
        }
      });
    });
    return statusIds;
  }, [pipelines]);

  // Helper function to get closed won status IDs for a specific pipeline
  const getClosedWonStatusIdsForPipeline = useCallback((pipelineId: number) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return new Set<number>();
    
    const statusIds = new Set<number>();
    pipeline.statuses.forEach(status => {
      const statusName = status.name.toLowerCase();
      if ((statusName.includes('fechado') || 
           statusName.includes('ganho') || 
           statusName.includes('won') || 
           statusName.includes('closed') ||
           statusName.includes('venda') ||
           statusName.includes('concluído') ||
           statusName.includes('finalizado')) &&
          !statusName.includes('lost') && 
          !statusName.includes('perdido') && 
          !statusName.includes('perdida')) {
        statusIds.add(status.id);
      }
    });
    
    console.log(`📊 Status "fechado/won" para pipeline ${pipelineId}:`, {
      pipelineName: pipeline.name,
      statusIds: Array.from(statusIds),
      allStatuses: pipeline.statuses.map(s => ({ id: s.id, name: s.name }))
    });
    
    return statusIds;
  }, [pipelines]);

  // Memoized sales ranking calculation
  const memoizedSalesRanking = useMemo(() => {
    if (!users.length || !allLeads.length || !pipelines.length) {
      console.log('📊 Ranking: Dados insuficientes', { users: users.length, leads: allLeads.length, pipelines: pipelines.length });
      return [];
    }

    // Get the appropriate closed won status IDs
    const relevantClosedWonIds = rankingPipelineFilter ? 
      getClosedWonStatusIdsForPipeline(rankingPipelineFilter) : 
      closedWonStatusIds;

    console.log('📊 Calculando ranking com filtros:', { 
      pipeline: rankingPipelineFilter, 
      dateRange: rankingDateRange,
      relevantClosedWonIds: Array.from(relevantClosedWonIds),
      usingPipelineSpecific: !!rankingPipelineFilter
    });

    const filterByPipeline = rankingPipelineFilter ? 
      (lead: any) => lead.pipeline_id === rankingPipelineFilter : 
      () => true;

    const filterByDateRange = (lead: any) => {
      if (!rankingDateRange.startDate || !rankingDateRange.endDate) return true;
      
      // Use closed_at for sales ranking (when the sale was completed)
      let leadDate: Date;
      if (lead.closed_at) {
        leadDate = new Date(lead.closed_at * 1000);
      } else {
        // Fallback to lastContact if closed_at is not available
        leadDate = new Date(lead.lastContact);
      }
      
      const startDate = new Date(rankingDateRange.startDate);
      const endDate = new Date(rankingDateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      
      return leadDate >= startDate && leadDate <= endDate;
    };

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const ranking = users.map(user => {
      // All user leads that are closed/won and match filters
      const userLeads = allLeads.filter(lead => 
        lead.responsible_user_id === user.id && 
        relevantClosedWonIds.has(lead.status_id) &&
        filterByPipeline(lead) &&
        filterByDateRange(lead)
      );
      
      // Current month sales (using same pipeline-specific logic if pipeline is filtered)
      const currentMonthClosedWonIds = rankingPipelineFilter ? 
        getClosedWonStatusIdsForPipeline(rankingPipelineFilter) : 
        closedWonStatusIds;
        
      const currentMonthLeads = allLeads.filter(lead => {
        if (lead.responsible_user_id !== user.id || !currentMonthClosedWonIds.has(lead.status_id)) {
          return false;
        }
        
        // Apply pipeline filter for current month too if set
        if (rankingPipelineFilter && lead.pipeline_id !== rankingPipelineFilter) {
          return false;
        }
        
        let leadDate: Date;
        if (lead.closed_at) {
          leadDate = new Date(lead.closed_at * 1000);
        } else {
          leadDate = new Date(lead.lastContact);
        }
        
        return leadDate >= startOfCurrentMonth && leadDate <= endOfCurrentMonth;
      });
      
      const totalSales = userLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const salesQuantity = userLeads.length;
      const currentMonthSales = currentMonthLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const currentMonthQuantity = currentMonthLeads.length;
      
      // Calculate monthly average based on filtered period
      const monthsInPeriod = rankingDateRange.startDate && rankingDateRange.endDate ? 
        Math.max(1, Math.ceil((rankingDateRange.endDate.getTime() - rankingDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))) :
        12;
      const monthlyAverage = totalSales / monthsInPeriod;
      
      return {
        userId: user.id,
        userName: user.name || 'Usuário sem nome',
        totalSales,
        salesQuantity,
        monthlyAverage,
        currentMonthSales,
        currentMonthQuantity
      };
    }).filter(user => user.salesQuantity > 0)
      .sort((a, b) => b.totalSales - a.totalSales);

    console.log('📊 Ranking calculado:', { 
      totalUsers: users.length, 
      usersWithSales: ranking.length,
      topSeller: ranking[0]?.userName,
      topSellerValue: ranking[0]?.totalSales
    });

    return ranking;
  }, [users, allLeads, pipelines, closedWonStatusIds, rankingPipelineFilter, rankingDateRange, getClosedWonStatusIdsForPipeline]);

  // Update sales ranking when memoized value changes
  useEffect(() => {
    setSalesRanking(memoizedSalesRanking);
  }, [memoizedSalesRanking]);

  // Memoized general stats calculation
  const memoizedGeneralStats = useMemo(() => {
    if (!generalStats) return null;
    
    // Add any heavy calculations here if needed
    return {
      ...generalStats,
      // Example: Add computed fields that depend on other data
      averageLeadValue: generalStats.activeLeads > 0 ? 
        Math.round(generalStats.totalRevenue / generalStats.activeLeads) : 0,
      performanceScore: Math.min(100, Math.round(generalStats.conversionRate * 2))
    };
  }, [generalStats]);

  // Filtered general stats by selected pipeline
  const filteredGeneralStats = useMemo(() => {
    if (!selectedPipeline || !allLeads.length) {
      return memoizedGeneralStats;
    }

    // Get pipeline-specific closed won status IDs
    const pipelineClosedWonIds = getClosedWonStatusIdsForPipeline(selectedPipeline);

    const pipelineLeads = allLeads.filter(lead => lead.pipeline_id === selectedPipeline);
    const activePipelineLeads = pipelineLeads.filter(lead => !pipelineClosedWonIds.has(lead.status_id));
    const closedWonPipelineLeads = pipelineLeads.filter(lead => pipelineClosedWonIds.has(lead.status_id));
    
    const totalRevenue = closedWonPipelineLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const activeLeads = activePipelineLeads.length;
    const conversions = closedWonPipelineLeads.length;
    const totalLeads = pipelineLeads.length;
    const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;

    console.log('📊 Stats filtradas por pipeline:', {
      selectedPipeline,
      pipelineClosedWonIds: Array.from(pipelineClosedWonIds),
      totalLeads,
      activeLeads,
      closedWonLeads: conversions,
      totalRevenue,
      conversionRate: `${conversionRate.toFixed(1)}%`
    });

    // Calculate changes (simplified for now)
    const revenueChange = "+0%";
    const leadsChange = "+0%";
    const conversionChange = "+0%";
    const callsChange = "+0%";

    return {
      totalRevenue,
      activeLeads,
      conversionRate,
      totalCalls: 0, // Not available in current data
      revenueChange,
      leadsChange,
      conversionChange,
      callsChange,
      averageLeadValue: activeLeads > 0 ? Math.round(totalRevenue / activeLeads) : 0,
      performanceScore: Math.min(100, Math.round(conversionRate * 2))
    };
  }, [memoizedGeneralStats, selectedPipeline, allLeads, getClosedWonStatusIdsForPipeline]);

  // Filtered sales data by selected pipeline
  const filteredSalesData = useMemo(() => {
    if (!selectedPipeline || !allLeads.length || !salesData?.length) {
      return salesData || [];
    }

    // Get pipeline-specific closed won status IDs
    const pipelineClosedWonIds = getClosedWonStatusIdsForPipeline(selectedPipeline);
    
    // Filtrar leads da pipeline selecionada que foram fechados com status específicos da pipeline
    const pipelineLeads = allLeads.filter(lead => 
      lead.pipeline_id === selectedPipeline && 
      lead.status_id && 
      pipelineClosedWonIds.has(lead.status_id) &&
      lead.closed_at
    );

    console.log('📊 Filtrado por pipeline:', {
      selectedPipeline,
      pipelineClosedWonIds: Array.from(pipelineClosedWonIds),
      totalLeads: allLeads.length,
      pipelineAllLeads: allLeads.filter(l => l.pipeline_id === selectedPipeline).length,
      pipelineClosedLeads: pipelineLeads.length,
      sampleLeads: pipelineLeads.slice(0, 3).map(l => ({ 
        id: l.id, 
        name: l.name, 
        value: l.value, 
        status_id: l.status_id, 
        closed_at: l.closed_at 
      }))
    });

    // Recalcular dados mensais para a pipeline selecionada
    const currentYear = new Date().getFullYear();
    const monthlyData = salesData.map(monthData => {
      const monthIndex = new Date(`${monthData.month} 1, ${currentYear}`).getMonth();
      
      const monthLeads = pipelineLeads.filter(lead => {
        const leadDate = new Date(lead.closed_at * 1000);
        return leadDate.getFullYear() === currentYear && leadDate.getMonth() === monthIndex;
      });

      const monthRevenue = monthLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      
      return {
        ...monthData,
        vendas: monthRevenue,
        leads: monthLeads.length,
        meta: monthRevenue > 0 ? monthRevenue * 1.2 : 0
      };
    });

    console.log('📊 Dados mensais recalculados para pipeline:', {
      selectedPipeline,
      totalAnual: monthlyData.reduce((sum, m) => sum + m.vendas, 0),
      leadsAnual: monthlyData.reduce((sum, m) => sum + m.leads, 0),
      mesesComVendas: monthlyData.filter(m => m.vendas > 0).length
    });

    return monthlyData;
  }, [salesData, selectedPipeline, allLeads, getClosedWonStatusIdsForPipeline]);

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

  // This useEffect is no longer needed as memoizedSalesRanking handles the calculation

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
    setDataIntegrityProgress({ status: 'Iniciando...', progress: 0 });
    
    try {
      // Verificar cache primeiro (válido por 5 minutos)
      const cachedStats = cache.getCache('generalStats') as GeneralStats | null;
      const cachedIntegrity = cache.getCache('dataIntegrity') as any | null;
      
      if (cachedStats && cachedIntegrity) {
        console.log('📦 Loading general stats and integrity from cache');
        setGeneralStats(cachedStats);
        setDataIntegrity(cachedIntegrity);
        console.log('🔍 Debug - Cache carregado:', {
          integrity: cachedIntegrity,
          hasIntegrity: !!cachedIntegrity
        });
        setDataIntegrityProgress({ status: 'Carregado do cache', progress: 100 });
        updateLoadingState('stats', false);
        return;
      }

      console.log('🔄 Fetching quick stats with integrity analysis...');
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      // Análise rápida com timeout de 2 minutos e progress callback
      console.log('🔍 Iniciando getStatsWithIntegrity...');
      const statsResult = await apiService.getStatsWithIntegrity({
        maxTimeMinutes: 2,
        onProgress: (status, progress) => {
          console.log(`📊 Progresso: ${status} - ${progress}%`);
          setDataIntegrityProgress({ status, progress });
        }
      });
      
      console.log('📊 Resultado da análise de integridade:', {
        stats: !!statsResult.stats,
        integrity: !!statsResult.integrity,
        integrity_data: statsResult.integrity
      });
      
      const allLeads = statsResult.stats.leads || [];
      const allPipelines = statsResult.stats.pipelines || [];
      const integrity = statsResult.integrity;
      
      const closedWonStatusIds = new Set<number>();
      allPipelines.forEach(pipeline => {
        pipeline.statuses?.forEach((status: any) => {
          const statusName = status.name.toLowerCase();
          if ((statusName.includes('fechado') || 
               statusName.includes('ganho') || 
               statusName.includes('won') || 
               statusName.includes('closed') ||
               statusName.includes('venda') ||
               statusName.includes('concluído') ||
               statusName.includes('finalizado')) &&
              !statusName.includes('lost') && 
              !statusName.includes('perdido') && 
              !statusName.includes('perdida')) {
            closedWonStatusIds.add(status.id);
          }
        });
      });
      
      closedWonStatusIds.add(142);
      
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
      setDataIntegrity(integrity);
      
      console.log('🔍 Debug - Dados de integridade definidos:', {
        integrity: integrity,
        hasIntegrity: !!integrity,
        totalLeads: integrity?.totalLeads,
        dataQuality: integrity?.dataQuality
      });
      
      // Cache com TTL baseado na qualidade dos dados
      const cacheTTL = integrity.dataQuality > 80 ? 5 * 60 * 1000 : 3 * 60 * 1000;
      cache.setCache('generalStats', stats, cacheTTL);
      cache.setCache('dataIntegrity', integrity, cacheTTL);

      // Log de diagnóstico detalhado
      console.log(`📊 Estatísticas carregadas:`);
      console.log(`   • Total de leads: ${integrity.totalLeads}`);
      console.log(`   • Leads não organizados: ${integrity.totalUnsorted}`);
      console.log(`   • Qualidade dos dados: ${integrity.dataQuality}%`);
      console.log(`   • Problemas detectados: ${integrity.missingData.length}`);

      // Toast informativo sobre qualidade
      if (integrity.dataQuality < 80) {
        toast({
          title: "Qualidade dos dados pode ser melhorada",
          description: `Score: ${integrity.dataQuality}%. Verifique o relatório de integridade.`,
          variant: "default",
        });
      }

    } catch (err: any) {
      console.error('🚨 Erro em fetchGeneralStats:', err);
      const errorMsg = `Erro ao carregar estatísticas: ${err.message}`;
      setError(errorMsg);
      
      // Definir dados padrão seguros em caso de erro
      const defaultIntegrity = {
        totalLeads: 0,
        totalUnsorted: 0,
        pipelineCounts: [],
        missingData: [`Erro ao carregar dados: ${err.message}. Clique em "Atualizar" para tentar novamente.`],
        dataQuality: 0,
        completedFully: false,
        analysisTime: 0
      };
      
      setDataIntegrity(defaultIntegrity);
      setDataIntegrityProgress({ status: 'Erro ao carregar', progress: 0 });
      
      toast({
        title: "Erro ao Carregar Estatísticas",
        description: err.message || 'Não foi possível carregar as estatísticas.',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('stats', false);
      setDataIntegrityProgress(prev => ({ ...prev, progress: 100 }));
    }
  }, [updateLoadingState, cache, toast]);

  const fetchAllLeads = useCallback(async () => {
    updateLoadingState('leads', true);
    
    try {
      const cachedLeads = cache.getCache('allLeads') as any[] | null;
      const cachedIntegrity = cache.getCache('leadsIntegrity') as any | null;
      
      if (cachedLeads && cachedIntegrity) {
        console.log('📦 Loading all leads from cache');
        setAllLeads(cachedLeads);
        setLeadsIntegrity(cachedIntegrity);
        updateLoadingState('leads', false);
        return;
      }

      console.log('🔄 Fetching all leads with integrity check...');
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const [leadsResponse, unsortedResponse] = await Promise.all([
        apiService.getAllLeads({
          with: ['contacts'],
          maxTimeMinutes: 20, // Timeout aumentado para contas grandes
          onProgress: (count, page, totalEstimated) => {
            setProgress(prev => ({
              ...prev,
              leads: { 
                current: count, 
                total: totalEstimated || count, 
                phase: `Carregando leads: ${count} carregados (página ${page})${totalEstimated ? ` | ~${totalEstimated} estimado` : ''}` 
              }
            }));
          }
        }),
        apiService.getAllUnsortedLeads({
          maxTimeMinutes: 10,
          onProgress: (count, page) => {
            setProgress(prev => ({
              ...prev,
              unsorted: { current: count, total: count, phase: `Carregando não organizados (página ${page})` }
            }));
          }
        })
      ]);
      
      const sortedLeads = leadsResponse._embedded?.leads || [];
      const unsortedLeads = unsortedResponse._embedded?.unsorted || [];
      const leadsIntegrityData = leadsResponse.integrity;
      const unsortedIntegrityData = unsortedResponse.integrity;
      
      // Salvar dados de integridade
      setLeadsIntegrity(leadsIntegrityData);
      setUnsortedIntegrity(unsortedIntegrityData);
      
      const formattedLeads = [
        ...sortedLeads.map((lead: any) => ({
          id: lead.id,
          name: lead.name || 'Lead sem nome',
          company: lead._embedded?.companies?.[0]?.name || 'Empresa não informada',
          email: lead._embedded?.contacts?.[0]?.custom_fields?.find((field: any) => field.field_name === 'EMAIL')?.values?.[0]?.value || 'Email não informado',
          phone: lead._embedded?.contacts?.[0]?.custom_fields?.find((field: any) => field.field_name === 'PHONE')?.values?.[0]?.value || 'Telefone não informado',
          stage: pipelines.find(p => p.id === lead.pipeline_id)?.statuses?.find(s => s.id === lead.status_id)?.name || 'Estágio não definido',
          value: lead.price || 0,
          lastContact: lead.updated_at ? new Date(lead.updated_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          closed_at: lead.closed_at,
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
          lastContact: lead.created_at ? new Date(lead.created_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: 'medium',
          source: lead.metadata?.source_name || 'Kommo CRM',
          responsible_user_id: lead._embedded?.leads?.[0]?.responsible_user_id || null,
          pipeline_id: lead.pipeline_id || null,
          custom_fields_values: lead._embedded?.leads?.[0]?.custom_fields_values || [],
          status_name: 'Etapa de entrada',
        }))
      ];

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      // Filtrar apenas leads fechados (closed won) dos leads organizados para o gráfico de vendas
      const closedWonLeads = sortedLeads.filter(lead => 
        closedWonStatusIds.has(lead.status_id) && lead.closed_at
      );
      
      console.log('📊 Calculando dados de vendas mensais:', {
        totalLeads: sortedLeads.length,
        closedWonLeads: closedWonLeads.length,
        closedWonStatusIds: Array.from(closedWonStatusIds),
        leadsSample: closedWonLeads.slice(0, 3).map(l => ({ id: l.id, status_id: l.status_id, closed_at: l.closed_at, price: l.price }))
      });
      
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthName = new Date(currentYear, i, 1).toLocaleString('pt-BR', { month: 'short' });
        const monthLeads = closedWonLeads.filter(lead => {
          const leadDate = new Date(lead.closed_at * 1000);
          return leadDate.getFullYear() === currentYear && leadDate.getMonth() === i;
        });
        
        const monthRevenue = monthLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
        const monthTarget = monthRevenue > 0 ? monthRevenue * 1.2 : 0; // Meta 20% acima
        
        return {
          month: monthName,
          vendas: monthRevenue,
          meta: monthTarget,
          leads: monthLeads.length
        };
      });

      setAllLeads(formattedLeads);
      setSalesData(monthlyData);
      
      console.log('📊 Dados de vendas finalizados:', {
        monthlyData: monthlyData.map(m => ({ 
          month: m.month, 
          vendas: m.vendas, 
          leads: m.leads 
        })),
        totalVendas: monthlyData.reduce((sum, m) => sum + m.vendas, 0)
      });

      // Cache com TTL baseado na qualidade dos dados
      const cacheTTL = leadsIntegrityData.completedFully ? 5 * 60 * 1000 : 2 * 60 * 1000;
      cache.setCache('allLeads', formattedLeads, cacheTTL);
      cache.setCache('salesData', monthlyData, cacheTTL);
      cache.setCache('leadsIntegrity', leadsIntegrityData, cacheTTL);
      cache.setCache('unsortedIntegrity', unsortedIntegrityData, cacheTTL);

      console.log('✅ Leads loading completed:', {
        total: formattedLeads.length,
        sorted: sortedLeads.length,
        unsorted: unsortedLeads.length,
        leadsQuality: leadsIntegrityData.completedFully ? 'High' : 'Partial',
        unsortedQuality: unsortedIntegrityData.completedFully ? 'High' : 'Partial'
      });

      // Toast informativo sobre qualidade dos dados
      if (!leadsIntegrityData.completedFully || !unsortedIntegrityData.completedFully) {
        toast({
          title: "Carregamento de leads concluído",
          description: `${formattedLeads.length} leads carregados. Verifique a aba "Integridade" para detalhes.`,
          variant: "default",
        });
      }

    } catch (err: any) {
      const errorMsg = `Erro ao carregar leads: ${err.message}`;
      setError(errorMsg);
      toast({
        title: "Erro ao Carregar Leads",
        description: err.message || 'Não foi possível carregar os leads.',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('leads', false);
    }
  }, [updateLoadingState, cache, toast, pipelines]);

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

  // Legacy function - now handled by memoizedSalesRanking
  const calculateSalesRanking = useCallback((includeZeroSales: boolean = true) => {
    console.log('🔄 calculateSalesRanking called (legacy) - now using memoized calculation');
    // The actual calculation is now handled by memoizedSalesRanking useMemo above
  }, []);

  const refreshData = useCallback(async () => {
    cache.clearCache();
    await Promise.all([
      fetchPipelines(),
      fetchGeneralStats(),
      fetchAllLeads(),
      fetchUsers(),
      fetchCustomFields()
    ]);
  }, [cache, fetchPipelines, fetchGeneralStats, fetchAllLeads, fetchUsers, fetchCustomFields]);

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
    filteredGeneralStats,
    allLeads,
    salesData: salesData || [],
    filteredSalesData,
    users,
    salesRanking: memoizedSalesRanking || [],
    setRankingPipeline: debouncedSetRankingPipeline,
    setRankingDateRange: debouncedSetRankingDateRange,
    rankingDateRange,
    calculateSalesRanking,
    customFields,
    
    // Integridade de dados
    dataIntegrity,
    leadsIntegrity,
    unsortedIntegrity,
    dataIntegrityProgress,
    closedWonStatusIds
  };

  // Log de debug para verificar os valores no retorno
  useEffect(() => {
    console.log('🔍 Hook Debug - Estados atuais:', {
      dataIntegrity: dataIntegrity,
      hasDataIntegrity: !!dataIntegrity,
      loadingStats: loadingStates.stats,
      dataIntegrityKeys: dataIntegrity ? Object.keys(dataIntegrity) : 'n/a'
    });
  }, [dataIntegrity, loadingStates.stats]);
}