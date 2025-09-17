import { useState, useEffect, useCallback } from "react";
import { KommoApiService, Pipeline } from "@/services/kommoApi";
import { KommoAuthService } from "@/services/kommoAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocalCache } from "@/hooks/useLocalCache";

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
  const { toast } = useToast();
  const cache = useLocalCache({ ttl: 5 * 60 * 1000, key: 'kommo-api' }); // 5 minutes cache

  // Helper to update specific loading state
  const updateLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

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

  useEffect(() => {
    if (users.length > 0 && allLeads.length > 0 && pipelines.length > 0) {
      calculateSalesRanking();
    }
  }, [users, allLeads, rankingPipelineFilter, rankingDateRange, pipelines]);

  const fetchPipelines = async () => {
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
  };

  const fetchPipelineStats = async (pipelineId: number) => {
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
  };

  const fetchGeneralStats = async () => {
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
      cache.setCache('generalStats', stats, 3 * 60 * 1000);
    } catch (err: any) {
      console.error('Error fetching general stats:', err);
    } finally {
      updateLoadingState('stats', false);
    }
  };

  const fetchAllLeads = async () => {
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
      
      const monthlyData = Array.from({ length: currentMonth + 1 }, (_, i) => {
        const monthName = new Date(currentYear, i, 1).toLocaleString('pt-BR', { month: 'short' });
        const monthLeads = sortedLeads.filter(lead => {
          if (!lead.updated_at && !lead.closed_at) return false;
          const leadTimestamp = lead.closed_at || lead.updated_at;
          const leadDate = new Date(leadTimestamp * 1000);
          return leadDate.getFullYear() === currentYear && leadDate.getMonth() === i;
        });
        
        const monthRevenue = monthLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
        const monthTarget = monthRevenue * 1.1;
        
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
        unsorted: unsortedLeads.length
      });
    } catch (err: any) {
      console.error('Error fetching leads:', err);
    } finally {
      updateLoadingState('leads', false);
    }
  };

  const fetchUsers = async () => {
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
  };

  const fetchCustomFields = async () => {
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
  };

  const calculateSalesRanking = (includeZeroSales: boolean = true) => {
    if (!users.length || !allLeads.length) return;
    
    const closedWonStatusIds = new Set<number>();
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
          closedWonStatusIds.add(status.id);
        }
      });
    });

    const ranking: SalesRankingData[] = users.map(user => {
      const userLeads = allLeads.filter(lead => 
        lead.responsible_user_id === user.id && closedWonStatusIds.has(lead.status_id)
      );
      
      const totalSales = userLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const salesQuantity = userLeads.length;
      const monthlyAverage = totalSales / 12;
      
      return {
        userId: user.id,
        userName: user.name || 'Usuário sem nome',
        totalSales,
        salesQuantity,
        monthlyAverage,
        currentMonthSales: totalSales, // Simplified for now
        currentMonthQuantity: salesQuantity
      };
    }).filter(user => includeZeroSales || user.salesQuantity > 0)
      .sort((a, b) => b.totalSales - a.totalSales);
    
    setSalesRanking(ranking);
  };

  const refreshData = async () => {
    cache.clearCache();
    await Promise.all([
      fetchPipelines(),
      fetchGeneralStats(),
      fetchAllLeads(),
      fetchUsers(),
      fetchCustomFields()
    ]);
  };

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
    generalStats,
    allLeads,
    salesData,
    users,
    salesRanking,
    setRankingPipeline: (pipelineId: number | null) => setRankingPipelineFilter(pipelineId),
    setRankingDateRange: (dateRange: DateRange) => setRankingDateRangeState(dateRange),
    rankingDateRange,
    calculateSalesRanking,
    customFields,
  };
};