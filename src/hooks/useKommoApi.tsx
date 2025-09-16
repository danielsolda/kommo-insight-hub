import { useState, useEffect } from "react";
import { KommoApiService, Pipeline } from "@/services/kommoApi";
import { KommoAuthService } from "@/services/kommoAuth";
import { useToast } from "@/hooks/use-toast";

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

export const useKommoApi = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [salesRanking, setSalesRanking] = useState<SalesRankingData[]>([]);
  const [rankingPipelineFilter, setRankingPipelineFilter] = useState<number | null>(null);
  const [rankingDateRange, setRankingDateRangeState] = useState<DateRange>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: startOfMonth, endDate: endOfMonth };
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPipelines();
    fetchGeneralStats();
    fetchAllLeads();
    fetchUsers();
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
    setLoading(true);
    setError(null);
    
    try {
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const response = await apiService.getPipelines();
      const rawPipelines = response._embedded?.pipelines || [] as RawPipeline[];
      
      // Transform the API response to match our interface
      const transformedPipelines: Pipeline[] = rawPipelines.map(pipeline => ({
        id: pipeline.id,
        name: pipeline.name,
        sort: pipeline.sort,
        is_main: pipeline.is_main,
        statuses: pipeline._embedded?.statuses || []
      }));
      
      setPipelines(transformedPipelines);
      
      // Auto-select main pipeline or first pipeline
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
      setLoading(false);
    }
  };

  const fetchPipelineStats = async (pipelineId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      console.log(`🔍 Buscando todos os leads da pipeline ${pipelineId}...`);

      // Fetch both sorted and unsorted leads for this pipeline with pagination
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

      // Calculate stats by status for sorted leads
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

      // Add unsorted leads as a special entry stage if there are any
      if (unsortedLeads.length > 0) {
        const unsortedValue = unsortedLeads.reduce((sum: number, lead: any) => {
          // Extract value from embedded leads if available
          const leadValue = lead._embedded?.leads?.[0]?.price || 0;
          return sum + leadValue;
        }, 0);

        statusStats.unshift({
          id: -1, // Special ID for unsorted
          name: "Etapa de entrada",
          count: unsortedLeads.length,
          value: unsortedValue,
          color: "#c1c1c1", // Gray color for unsorted leads
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
      setLoading(false);
    }
  };

  const fetchGeneralStats = async () => {
    try {
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      console.log('📊 Buscando estatísticas gerais com todos os leads...');

      // Fetch all leads to calculate general stats with pagination
      const [leadsResponse, pipelinesResponse] = await Promise.all([
        apiService.getAllLeads({
          onProgress: (count, page) => console.log(`📊 Estatísticas - Leads: ${count} (página ${page})`)
        }).catch((err) => {
          console.error('Erro ao buscar leads para estatísticas:', err);
          return { _embedded: { leads: [] } };
        }),
        apiService.getPipelines().catch(() => ({ _embedded: { pipelines: [] } }))
      ]);

      const allLeads = leadsResponse._embedded?.leads || [];
      console.log(`📊 Total leads carregados: ${allLeads.length}`);
      
      // Get closed won status IDs
      const closedWonStatusIds = new Set<number>();
      const allPipelines = pipelinesResponse._embedded?.pipelines || [];
      
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
      
      // Add manual status ID based on previous analysis
      closedWonStatusIds.add(142);
      
      console.log('🎯 Status IDs considerados "Closed Won":', Array.from(closedWonStatusIds));
      
      // Get current month boundaries for filtering
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      
      // Filter leads by categories
      const closedWonLeads = allLeads.filter(lead => closedWonStatusIds.has(lead.status_id));
      const activeLeads = allLeads.filter(lead => !closedWonStatusIds.has(lead.status_id));
      
      // Calculate current month metrics
      const currentMonthClosedWon = closedWonLeads.filter(lead => {
        const leadDate = new Date(lead.closed_at || lead.updated_at);
        return leadDate >= currentMonthStart && leadDate <= currentMonthEnd;
      });
      
      const currentMonthActive = allLeads.filter(lead => {
        const leadDate = new Date(lead.created_at || lead.updated_at);
        return leadDate >= currentMonthStart && leadDate <= currentMonthEnd;
      });
      
      // Calculate previous month metrics for comparison
      const previousMonthClosedWon = closedWonLeads.filter(lead => {
        const leadDate = new Date(lead.closed_at || lead.updated_at);
        return leadDate >= previousMonthStart && leadDate <= previousMonthEnd;
      });
      
      const previousMonthActive = allLeads.filter(lead => {
        const leadDate = new Date(lead.created_at || lead.updated_at);
        return leadDate >= previousMonthStart && leadDate <= previousMonthEnd;
      });
      
      // Calculate metrics
      const totalRevenue = closedWonLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
      const currentRevenue = currentMonthClosedWon.reduce((sum, lead) => sum + (lead.price || 0), 0);
      const previousRevenue = previousMonthClosedWon.reduce((sum, lead) => sum + (lead.price || 0), 0);
      
      const conversionRate = allLeads.length > 0 ? (closedWonLeads.length / allLeads.length) * 100 : 0;
      const previousConversionRate = (previousMonthActive.length + currentMonthActive.length) > 0 ? 
        ((previousMonthClosedWon.length + currentMonthClosedWon.length) / (previousMonthActive.length + currentMonthActive.length)) * 100 : 0;
      
      // Calculate percentage changes
      const calculateChange = (current: number, previous: number): string => {
        if (previous === 0) return current > 0 ? "+100%" : "0%";
        const change = ((current - previous) / previous) * 100;
        return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
      };
      
      const stats: GeneralStats = {
        totalRevenue,
        activeLeads: activeLeads.length,
        conversionRate,
        totalCalls: 0, // Not available from Kommo API
        revenueChange: calculateChange(currentRevenue, previousRevenue),
        leadsChange: calculateChange(currentMonthActive.length, previousMonthActive.length),
        conversionChange: calculateChange(conversionRate, previousConversionRate),
        callsChange: "N/A" // Not available from Kommo API
      };
      
      console.log('📊 Estatísticas calculadas:', {
        totalRevenue,
        activeLeads: activeLeads.length,
        closedWonLeads: closedWonLeads.length,
        conversionRate: `${conversionRate.toFixed(1)}%`,
        currentMonthRevenue: currentRevenue,
        previousMonthRevenue: previousRevenue
      });

      setGeneralStats(stats);
    } catch (err: any) {
      console.error('Error fetching general stats:', err);
    }
  };

  const fetchAllLeads = async () => {
    try {
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      console.log('📋 Buscando todos os leads com paginação completa...');

      const [leadsResponse, unsortedResponse] = await Promise.all([
        apiService.getAllLeads({ 
          with: ['contacts'],
          onProgress: (count, page) => console.log(`📋 Todos os leads: ${count} (página ${page})`)
        }).catch((err) => {
          console.error('Erro ao buscar todos os leads:', err);
          return { _embedded: { leads: [] } };
        }),
        apiService.getAllUnsortedLeads({
          onProgress: (count, page) => console.log(`📋 Não organizados: ${count} (página ${page})`)
        }).catch((err) => {
          console.error('Erro ao buscar leads não organizados:', err);
          return { _embedded: { unsorted: [] } };
        })
      ]);

      const sortedLeads = leadsResponse._embedded?.leads || [];
      const unsortedLeads = unsortedResponse._embedded?.unsorted || [];
      
      // Combine and format leads for the table
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
          pipeline_id: lead.pipeline_id || null
        }))
      ];

      setAllLeads(formattedLeads);

      // Generate sales data by month from leads
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthName = new Date(2024, i, 1).toLocaleString('pt-BR', { month: 'short' });
        const monthLeads = sortedLeads.filter(lead => {
          if (!lead.updated_at) return false;
          const leadDate = new Date(lead.updated_at * 1000);
          return leadDate.getMonth() === i;
        });
        
        const monthRevenue = monthLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
        const monthTarget = monthRevenue * 1.1; // Target is 10% higher than actual
        
        return {
          month: monthName,
          vendas: monthRevenue,
          meta: monthTarget,
          leads: monthLeads.length
        };
      });

      setSalesData(monthlyData);
    } catch (err: any) {
      console.error('Error fetching all leads:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
      const authService = new KommoAuthService(kommoConfig);
      const apiService = new KommoApiService(authService, kommoConfig.accountUrl);

      const response = await apiService.getUsers();
      const users = response._embedded?.users || [];
      setUsers(users);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  // Helper function to identify "Closed Won" status IDs from all pipelines
  const getClosedWonStatusIds = () => {
    const closedWonStatusIds = new Set<number>();
    
    console.log('🔍 DEBUG: Analyzing pipelines for Closed Won statuses');
    console.log('📊 Available pipelines:', pipelines);
    
    pipelines.forEach(pipeline => {
      console.log(`\n📈 Pipeline: ${pipeline.name} (ID: ${pipeline.id})`);
      pipeline.statuses.forEach(status => {
        console.log(`  📋 Status: "${status.name}" (ID: ${status.id})`);
        
        const statusName = status.name.toLowerCase();
        // Identify status that represents closed/won deals
        if (statusName.includes('fechado') || 
            statusName.includes('ganho') || 
            statusName.includes('won') || 
            statusName.includes('closed') ||
            statusName.includes('venda') ||
            statusName.includes('concluído') ||
            statusName.includes('finalizado')) {
          // Exclude "lost" or "perdido" statuses
          if (!statusName.includes('lost') && 
              !statusName.includes('perdido') && 
              !statusName.includes('perdida')) {
            closedWonStatusIds.add(status.id);
            console.log(`  ✅ Found Closed Won status: "${status.name}" (ID: ${status.id})`);
          } else {
            console.log(`  ❌ Excluded lost status: "${status.name}" (ID: ${status.id})`);
          }
        }
      });
    });
    
    // Based on real API data, status ID 142 appears to be "Closed Won"
    // Adding it manually for now
    closedWonStatusIds.add(142);
    console.log(`\n🎯 Manual addition: Status ID 142 (from real data analysis)`);
    
    console.log(`\n🏆 Final Closed Won Status IDs:`, Array.from(closedWonStatusIds));
    return closedWonStatusIds;
  };

  const calculateSalesRanking = (includeZeroSales = false) => {
    if (!users.length || !allLeads.length || !pipelines.length) return;
    
    console.log('\n🚀 Starting Sales Ranking Calculation');
    console.log('👥 Users:', users.length);
    console.log('📋 All Leads:', allLeads.length);
    console.log('🔄 Pipeline Filter:', rankingPipelineFilter);
    console.log('📅 Date Range:', rankingDateRange);
    console.log('🐛 Include Zero Sales:', includeZeroSales);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const closedWonStatusIds = getClosedWonStatusIds();
    
    // Determine the date range for calculations
    const { startDate, endDate } = rankingDateRange;
    const hasDateFilter = startDate && endDate;
    
    console.log(`\n📅 Current Month: ${currentMonth}, Year: ${currentYear}`);
    console.log(`📊 Date Filter Active: ${hasDateFilter ? 'Yes' : 'No'}`);
    if (hasDateFilter) {
      console.log(`📊 Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    }
    
    const ranking = users
      .filter(user => user.rights?.is_active !== false) // Only include active users
      .map(user => {
      console.log(`\n👤 Processing user: ${user.name} (ID: ${user.id})`);
      
      // Filter leads for this user, optionally by ranking pipeline filter
      let userLeads = allLeads.filter(lead => {
        const isUserLead = lead.responsible_user_id === user.id;
        
        if (rankingPipelineFilter) {
          return isUserLead && lead.pipeline_id === rankingPipelineFilter;
        }
        return isUserLead;
      });
      
      console.log(`  📊 User leads found: ${userLeads.length}`);
      
      // Filter to only count "Closed Won" leads (actual sales)
      const closedWonLeads = userLeads.filter(lead => {
        const isClosedWon = closedWonStatusIds.has(lead.status_id);
        if (isClosedWon) {
          console.log(`    ✅ Closed Won Lead: ${lead.name} (Status: ${lead.status_id}, Value: ${lead.value})`);
        }
        return isClosedWon;
      });
      
      console.log(`  🎯 Closed Won leads for ${user.name}: ${closedWonLeads.length}`);
      
      const totalSales = closedWonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const salesQuantity = closedWonLeads.length;
      
      console.log(`  💰 Total Sales: R$ ${totalSales.toLocaleString()}`);
      
      // Calculate period-based sales (current month or custom date range)
      const periodClosedWonLeads = closedWonLeads.filter(lead => {
        if (hasDateFilter && startDate && endDate) {
          // Use custom date range
          if (!lead.closed_at) {
            // Fallback to lastContact if closed_at is not available
            const leadDate = new Date(lead.lastContact);
            const isInDateRange = leadDate >= startDate && leadDate <= endDate;
            if (isInDateRange) {
              console.log(`    📅 Date range sale (using lastContact): ${lead.name} - R$ ${lead.value}`);
            }
            return isInDateRange;
          }
          
          const closedDate = new Date(lead.closed_at * 1000);
          const isInDateRange = closedDate >= startDate && closedDate <= endDate;
          if (isInDateRange) {
            console.log(`    📅 Date range sale (using closed_at): ${lead.name} - R$ ${lead.value}`);
          }
          return isInDateRange;
        } else {
          // Use current month logic (default)
          if (!lead.closed_at) {
            // Fallback to lastContact if closed_at is not available
            const leadDate = new Date(lead.lastContact);
            const isCurrentMonth = leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
            if (isCurrentMonth) {
              console.log(`    📅 Current month sale (using lastContact): ${lead.name} - R$ ${lead.value}`);
            }
            return isCurrentMonth;
          }
          
          const closedDate = new Date(lead.closed_at * 1000);
          const isCurrentMonth = closedDate.getMonth() === currentMonth && closedDate.getFullYear() === currentYear;
          if (isCurrentMonth) {
            console.log(`    📅 Current month sale (using closed_at): ${lead.name} - R$ ${lead.value}`);
          }
          return isCurrentMonth;
        }
      });
      
      const currentMonthSales = periodClosedWonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const currentMonthQuantity = periodClosedWonLeads.length;
      
      const periodLabel = hasDateFilter ? 'Period Sales' : 'Current Month Sales';
      console.log(`  📆 ${periodLabel}: R$ ${currentMonthSales.toLocaleString()} (${currentMonthQuantity} deals)`);
      
      // Calculate monthly average (assuming 12 months of data)
      const monthlyAverage = totalSales / 12;
      
      return {
        userId: user.id,
        userName: user.name || 'Usuário sem nome',
        totalSales,
        salesQuantity,
        monthlyAverage,
        currentMonthSales,
        currentMonthQuantity
      };
    }).filter(user => {
      const hasActualSales = user.salesQuantity > 0;
      if (hasActualSales) {
        console.log(`✅ Including in ranking: ${user.userName} with ${user.salesQuantity} sales`);
      } else {
        console.log(`${includeZeroSales ? '🔍' : '❌'} ${includeZeroSales ? 'Including' : 'Excluding'} from ranking: ${user.userName} (no sales)`);
      }
      return includeZeroSales || hasActualSales;
    }).sort((a, b) => b.totalSales - a.totalSales); // Sort by total sales descending
    
    console.log('\n🏆 Final Sales Ranking:', ranking);
    setSalesRanking(ranking);
  };

  const setRankingPipeline = (pipelineId: number | null) => {
    setRankingPipelineFilter(pipelineId);
  };

  const setRankingDateRange = (dateRange: DateRange) => {
    setRankingDateRangeState(dateRange);
  };

  const refreshData = async () => {
    await Promise.all([
      fetchPipelines(),
      fetchGeneralStats(),
      fetchAllLeads(),
      fetchUsers()
    ]);
    if (selectedPipeline) {
      await fetchPipelineStats(selectedPipeline);
    }
  };

  return {
    pipelines,
    pipelineStats: pipelineStats.find(p => p.pipelineId === selectedPipeline),
    selectedPipeline,
    setSelectedPipeline,
    loading,
    error,
    refreshData,
    generalStats,
    allLeads,
    salesData,
    users,
    salesRanking,
    setRankingPipeline,
    setRankingDateRange,
    rankingDateRange,
    calculateSalesRanking,
  };
};