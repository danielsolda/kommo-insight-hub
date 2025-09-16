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
  }, [users, allLeads, rankingPipelineFilter, pipelines]);

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

      // Fetch both sorted and unsorted leads for this pipeline
      const [leadsResponse, unsortedResponse] = await Promise.all([
        apiService.getLeads({
          filter: { pipeline_id: pipelineId },
          limit: 250
        }).catch(() => ({ _embedded: { leads: [] } })),
        apiService.getUnsortedLeads({
          filter: { pipeline_id: pipelineId },
          limit: 250
        }).catch(() => ({ _embedded: { unsorted: [] } }))
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

      // Fetch all leads to calculate general stats
      const [leadsResponse, pipelinesResponse] = await Promise.all([
        apiService.getLeads({ limit: 250 }).catch(() => ({ _embedded: { leads: [] } })),
        apiService.getPipelines().catch(() => ({ _embedded: { pipelines: [] } }))
      ]);

      const allLeads = leadsResponse._embedded?.leads || [];
      const totalRevenue = allLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
      const activeLeads = allLeads.length;
      
      // Calculate conversion rate (simplified: closed leads / total leads)
      const closedLeads = allLeads.filter(lead => {
        const statusId = lead.status_id;
        // You might need to adjust this logic based on your status IDs for "closed won"
        return statusId && (lead.closest_task_at || lead.updated_at);
      });
      const conversionRate = activeLeads > 0 ? (closedLeads.length / activeLeads) * 100 : 0;

      // Mock values for changes (in real scenario, you'd compare with previous period)
      const stats: GeneralStats = {
        totalRevenue,
        activeLeads,
        conversionRate,
        totalCalls: Math.floor(activeLeads * 2.5), // Estimated calls per lead
        revenueChange: "+12.5%",
        leadsChange: "+8.2%", 
        conversionChange: conversionRate > 20 ? "+2.1%" : "-2.1%",
        callsChange: "+15.3%"
      };

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

      const [leadsResponse, unsortedResponse] = await Promise.all([
        apiService.getLeads({ limit: 250, with: ['contacts'] }).catch(() => ({ _embedded: { leads: [] } })),
        apiService.getUnsortedLeads({ limit: 250 }).catch(() => ({ _embedded: { unsorted: [] } }))
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
    
    pipelines.forEach(pipeline => {
      pipeline.statuses.forEach(status => {
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
          }
        }
      });
    });
    
    return closedWonStatusIds;
  };

  const calculateSalesRanking = () => {
    if (!users.length || !allLeads.length || !pipelines.length) return;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const closedWonStatusIds = getClosedWonStatusIds();
    
    const ranking = users.map(user => {
      // Filter leads for this user, optionally by ranking pipeline filter
      let userLeads = allLeads.filter(lead => {
        const isUserLead = lead.responsible_user_id === user.id;
        
        if (rankingPipelineFilter) {
          return isUserLead && lead.pipeline_id === rankingPipelineFilter;
        }
        return isUserLead;
      });
      
      // Filter to only count "Closed Won" leads (actual sales)
      const closedWonLeads = userLeads.filter(lead => 
        closedWonStatusIds.has(lead.status_id)
      );
      
      const totalSales = closedWonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const salesQuantity = closedWonLeads.length;
      
      // Calculate current month sales (only closed won)
      const currentMonthClosedWonLeads = closedWonLeads.filter(lead => {
        const leadDate = new Date(lead.lastContact);
        return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
      });
      
      const currentMonthSales = currentMonthClosedWonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const currentMonthQuantity = currentMonthClosedWonLeads.length;
      
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
    }).filter(user => user.salesQuantity > 0) // Only show users with actual sales
      .sort((a, b) => b.totalSales - a.totalSales); // Sort by total sales descending
    
    setSalesRanking(ranking);
  };

  const setRankingPipeline = (pipelineId: number | null) => {
    setRankingPipelineFilter(pipelineId);
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
  };
};