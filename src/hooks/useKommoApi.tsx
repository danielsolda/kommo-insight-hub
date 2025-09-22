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
  // Comparison data for filtered stats
  totalRevenueComparison?: number;
  activeLeadsComparison?: number;
  conversionRateComparison?: number;
  roiComparison?: number;
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

interface ConversionTimeData {
  averageConversionTime: number;
  averageTimePerStatus: { statusName: string; avgDays: number; color: string }[];
  conversionRate: number;
  stuckLeads: number;
  totalLeads: number;
  fastestConversion: number;
  slowestConversion: number;
}

interface TimeAnalysisData {
  statusTimeData: Array<{
    name: string;
    avgDays: number;
    leadCount: number;
    color: string;
  }>;
  conversionDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  criticalLeads: Array<{
    id: string | number;
    name: string;
    statusName: string;
    daysInStatus: number;
    value: number;
  }>;
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
  
  // Sales chart period filtering states
  const [salesPeriod, setSalesPeriod] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [salesComparisonMode, setSalesComparisonMode] = useState(false);
  const [salesComparisonPeriod, setSalesComparisonPeriod] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear() - 1, new Date().getMonth() - 6, 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 0).toISOString().split('T')[0]
  });
  
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

  // Function to classify lead status based on pipeline structure
  const classifyLeadStatus = useCallback((lead: any, pipelinesList: Pipeline[]) => {
    // Find the specific pipeline for this lead
    const leadPipeline = pipelinesList.find(p => p.id === lead.pipeline_id);
    
    // Handle unsorted leads (entry status)
    if (!lead.status_id || lead.stage === "Etapa de entrada" || lead.id?.toString().startsWith('unsorted-')) {
      return "entrada";
    }
    
    // Handle "Venda Ganha" (closed won) - universal status ID 142
    if (lead.status_id === 142) {
      return "ganho";
    }
    
    if (leadPipeline && leadPipeline.statuses) {
      const status = leadPipeline.statuses.find(s => s.id === lead.status_id);
      if (status) {
        const statusName = status.name.toLowerCase();
        
        // Identify final negative statuses (lost/closed)
        if (statusName.includes('perdid') || statusName.includes('lost') || 
            statusName.includes('cancelad') || statusName.includes('rejeitad') ||
            statusName.includes('recusad') || statusName.includes('abandon') ||
            statusName.includes('negativo') || statusName.includes('fechado negativo') ||
            statusName.includes('closed') || statusName.includes('não qualific')) {
          return "perdido";
        }
        
        // Check for additional won status names (beyond universal ID 142)
        if (statusName.includes('ganha') || statusName.includes('fechado positivo') || 
            statusName.includes('won') || statusName.includes('venda realizada') ||
            statusName.includes('sucesso') || statusName.includes('convertido')) {
          return "ganho";
        }
        
        // Check if it's the first status (entry status) by sort order
        const sortedStatuses = [...leadPipeline.statuses].sort((a, b) => a.sort - b.sort);
        if (sortedStatuses.length > 0 && status.id === sortedStatuses[0].id) {
          return "entrada";
        }
        
        // Check if it's the last status and not explicitly won/lost
        if (sortedStatuses.length > 0 && status.id === sortedStatuses[sortedStatuses.length - 1].id) {
          // If it's the last status but not identified as won or lost, assume it's won
          return "ganho";
        }
        
        // If it's not won, lost, or entry, it's in progress
        return "andamento";
      }
    }
    
    // Default: if we can't classify it properly, consider it in progress
    return "andamento";
  }, []);

  // Function to identify leads that have "entered the funnel"
  const getLeadsInFunnel = useCallback((leads: any[], pipelinesList: Pipeline[]) => {
    return leads.filter(lead => {
      const classification = classifyLeadStatus(lead, pipelinesList);
      // Leads in funnel are those that are not just in entry status
      // They include: andamento, ganho, perdido (but exclude entrada)
      return classification !== "entrada";
    });
  }, [classifyLeadStatus]);

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

  // Memoized filtered sales data calculation with period filtering and comparison
  const filteredSalesData = useMemo(() => {
    console.log(`🔄 Recalculando dados de vendas com filtro de período...`);
    console.log(`   📋 Pipeline filter: ${salesChartPipelineFilter}`);
    console.log(`   📅 Período atual: ${salesPeriod.start} até ${salesPeriod.end}`);
    console.log(`   🔄 Comparação ativa: ${salesComparisonMode}`);
    
    if (!pipelines.length || !allLeads.length) {
      console.log('📊 Dados insuficientes - pipelines ou leads');
      return [];
    }

    // Generate months for the current period
    const getMonthsInRange = (start: string, end: string) => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const months = [];
      
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (current <= endDate) {
        months.push({
          year: current.getFullYear(),
          month: current.getMonth(),
          monthKey: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
          monthName: current.toLocaleDateString('pt-BR', { month: 'short' })
        });
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    };

    const currentMonths = getMonthsInRange(salesPeriod.start, salesPeriod.end);
    const comparisonMonths = salesComparisonMode ? getMonthsInRange(salesComparisonPeriod.start, salesComparisonPeriod.end) : [];

    // Filter leads for current period
    const currentPeriodLeads = allLeads.filter(lead => {
      const closedAt = lead.closed_at ? new Date(lead.closed_at * 1000) : null;
      if (!closedAt) return false;
      
      const periodStart = new Date(salesPeriod.start);
      const periodEnd = new Date(salesPeriod.end);
      
      return closedAt >= periodStart && closedAt <= periodEnd;
    });

    // Filter leads for comparison period
    const comparisonPeriodLeads = salesComparisonMode ? allLeads.filter(lead => {
      const closedAt = lead.closed_at ? new Date(lead.closed_at * 1000) : null;
      if (!closedAt) return false;
      
      const periodStart = new Date(salesComparisonPeriod.start);
      const periodEnd = new Date(salesComparisonPeriod.end);
      
      return closedAt >= periodStart && closedAt <= periodEnd;
    }) : [];

    console.log(`📊 Leads filtrados por período:`);
    console.log(`   📈 Período atual: ${currentPeriodLeads.length} leads`);
    console.log(`   📉 Período comparação: ${comparisonPeriodLeads.length} leads`);

    // Create data structure
    const maxLength = Math.max(currentMonths.length, comparisonMonths.length);
    return Array.from({ length: maxLength }, (_, index) => {
      const currentMonth = currentMonths[index];
      const comparisonMonth = comparisonMonths[index];
      
      const monthName = currentMonth?.monthName || 
                       (comparisonMonth?.monthName || 
                        new Date(new Date().getFullYear(), index).toLocaleDateString('pt-BR', { month: 'short' }));

      // Current period data
      const currentLeadsInMonth = currentMonth ? currentPeriodLeads.filter(lead => {
        const closedAt = lead.closed_at ? new Date(lead.closed_at * 1000) : null;
        return closedAt && closedAt.getFullYear() === currentMonth.year && closedAt.getMonth() === currentMonth.month;
      }) : [];

      // Comparison period data
      const comparisonLeadsInMonth = comparisonMonth ? comparisonPeriodLeads.filter(lead => {
        const closedAt = lead.closed_at ? new Date(lead.closed_at * 1000) : null;
        return closedAt && closedAt.getFullYear() === comparisonMonth.year && closedAt.getMonth() === comparisonMonth.month;
      }) : [];

      // Apply pipeline filter if selected
      const pipelineFilterFn = salesChartPipelineFilter ? 
        (lead: any) => lead.pipeline_id === salesChartPipelineFilter && lead.status_id === 142 :
        (lead: any) => lead.status_id === 142;

      const currentSales = currentLeadsInMonth
        .filter(pipelineFilterFn)
        .reduce((sum, lead) => sum + (lead.price || 0), 0);

      const comparisonSales = comparisonLeadsInMonth
        .filter(pipelineFilterFn)
        .reduce((sum, lead) => sum + (lead.price || 0), 0);

      const currentLeadsCount = currentLeadsInMonth.filter(pipelineFilterFn).length;
      const comparisonLeadsCount = comparisonLeadsInMonth.filter(pipelineFilterFn).length;

      return {
        month: monthName,
        vendas: currentSales,
        meta: investmentConfig.monthlySalesGoal, // Use configured target
        leads: currentLeadsCount,
        vendasComparacao: salesComparisonMode ? comparisonSales : undefined,
        metaComparacao: salesComparisonMode ? investmentConfig.monthlySalesGoal : undefined,
        leadsComparacao: salesComparisonMode ? comparisonLeadsCount : undefined,
      };
    });
  }, [allLeads, pipelines, salesChartPipelineFilter, salesPeriod, salesComparisonMode, salesComparisonPeriod, investmentConfig]);

  // Filtered general stats based on sales chart filters
  const filteredGeneralStats = useMemo(() => {
    if (!allLeads.length) return null;

    console.log('🧮 Calculating filtered general stats');
    console.log(`   📊 Pipeline Filter: ${salesChartPipelineFilter || 'All'}`);
    console.log(`   📅 Period: ${salesPeriod.start} to ${salesPeriod.end}`);
    console.log(`   🔄 Comparison Mode: ${salesComparisonMode}`);

    const calculateChange = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const change = ((current - previous) / previous) * 100;
      return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
    };

    // Filter leads based on current period (for revenue and conversion rate)
    const currentPeriodLeads = allLeads.filter(lead => {
      // Pipeline filter
      if (salesChartPipelineFilter && lead.pipeline_id !== salesChartPipelineFilter) {
        return false;
      }
      
      // Period filter - use closed_at for won leads, updated_at for others
      const leadDate = classifyLeadStatus(lead, pipelines) === "ganho" && lead.closed_at 
        ? new Date(lead.closed_at * 1000)
        : new Date(lead.updated_at * 1000);
      
      const periodStart = new Date(salesPeriod.start);
      const periodEnd = new Date(salesPeriod.end);
      
      return leadDate >= periodStart && leadDate <= periodEnd;
    });

    // For "Leads em Andamento" - get ALL current active leads regardless of period
    const allActiveLeads = allLeads.filter(lead => {
      // Pipeline filter
      if (salesChartPipelineFilter && lead.pipeline_id !== salesChartPipelineFilter) {
        return false;
      }
      // Only get leads currently in progress
      return classifyLeadStatus(lead, pipelines) === "andamento";
    });

    // Filter comparison period leads if comparison mode is active
    const comparisonPeriodLeads = salesComparisonMode ? allLeads.filter(lead => {
      // Pipeline filter
      if (salesChartPipelineFilter && lead.pipeline_id !== salesChartPipelineFilter) {
        return false;
      }
      
      // Comparison period filter
      const leadDate = classifyLeadStatus(lead, pipelines) === "ganho" && lead.closed_at 
        ? new Date(lead.closed_at * 1000)
        : new Date(lead.updated_at * 1000);
      
      const periodStart = new Date(salesComparisonPeriod.start);
      const periodEnd = new Date(salesComparisonPeriod.end);
      
      return leadDate >= periodStart && leadDate <= periodEnd;
    }) : [];

    // Calculate current period stats
    const currentClosedWonLeads = currentPeriodLeads.filter(lead => classifyLeadStatus(lead, pipelines) === "ganho");
    const currentLostLeads = currentPeriodLeads.filter(lead => classifyLeadStatus(lead, pipelines) === "perdido");
    
    // Get leads that entered the funnel during the period (for conversion rate calculation)
    const leadsEnteredFunnelInPeriod = currentPeriodLeads.filter(lead => {
      const classification = classifyLeadStatus(lead, pipelines);
      return classification !== "entrada"; // Any lead that progressed beyond entry
    });
    
    const currentRevenue = currentClosedWonLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
    
    // Conversion rate: leads won in period / leads that entered funnel in period
    const currentConversionRate = leadsEnteredFunnelInPeriod.length > 0 
      ? (currentClosedWonLeads.length / leadsEnteredFunnelInPeriod.length) * 100 
      : 0;

    // Calculate comparison period stats if comparison mode is active
    const comparisonClosedWonLeads = salesComparisonMode 
      ? comparisonPeriodLeads.filter(lead => classifyLeadStatus(lead, pipelines) === "ganho") 
      : [];
    const comparisonLostLeads = salesComparisonMode 
      ? comparisonPeriodLeads.filter(lead => classifyLeadStatus(lead, pipelines) === "perdido") 
      : [];
    const comparisonRevenue = salesComparisonMode 
      ? comparisonClosedWonLeads.reduce((sum, lead) => sum + (lead.price || 0), 0) 
      : 0;
    
    // Get leads that entered funnel in comparison period
    const comparisonLeadsEnteredFunnel = salesComparisonMode 
      ? comparisonPeriodLeads.filter(lead => classifyLeadStatus(lead, pipelines) !== "entrada")
      : [];
    
    const comparisonConversionRate = salesComparisonMode && comparisonLeadsEnteredFunnel.length > 0
      ? (comparisonClosedWonLeads.length / comparisonLeadsEnteredFunnel.length) * 100 
      : 0;
    
    // For comparison active leads, get historical count
    const comparisonActiveLeads = salesComparisonMode 
      ? comparisonPeriodLeads.filter(lead => classifyLeadStatus(lead, pipelines) === "andamento") 
      : [];

    // Calculate ROI based on investment per month in the period
    const periodDurationMonths = Math.max(1, Math.ceil((new Date(salesPeriod.end).getTime() - new Date(salesPeriod.start).getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const periodInvestment = investmentConfig.monthlyInvestment * periodDurationMonths;
    const currentROI = periodInvestment > 0 ? ((currentRevenue - periodInvestment) / periodInvestment) * 100 : 0;

    const comparisonPeriodDurationMonths = salesComparisonMode 
      ? Math.max(1, Math.ceil((new Date(salesComparisonPeriod.end).getTime() - new Date(salesComparisonPeriod.start).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 0;
    const comparisonPeriodInvestment = salesComparisonMode 
      ? investmentConfig.monthlyInvestment * comparisonPeriodDurationMonths 
      : 0;
    const comparisonROI = salesComparisonMode && comparisonPeriodInvestment > 0 
      ? ((comparisonRevenue - comparisonPeriodInvestment) / comparisonPeriodInvestment) * 100 
      : 0;

    console.log(`   💰 Current Revenue: R$ ${currentRevenue.toLocaleString()}`);
    console.log(`   👥 ALL Active Leads (em andamento): ${allActiveLeads.length}`);
    console.log(`   📈 Current Conversion Rate (ganhos/entradas no funil): ${currentConversionRate.toFixed(1)}%`);
    console.log(`   🔢 Leads that entered funnel in period: ${leadsEnteredFunnelInPeriod.length}`);
    console.log(`   ✅ Current Won Leads: ${currentClosedWonLeads.length}`);
    console.log(`   💹 Current ROI: ${currentROI.toFixed(1)}%`);

    if (salesComparisonMode) {
      console.log(`   💰 Comparison Revenue: R$ ${comparisonRevenue.toLocaleString()}`);
      console.log(`   👥 Comparison Active Leads (em andamento): ${comparisonActiveLeads.length}`);
      console.log(`   📈 Comparison Conversion Rate (ganhos/entradas no funil): ${comparisonConversionRate.toFixed(1)}%`);
      console.log(`   🔢 Comparison Leads entered funnel: ${comparisonLeadsEnteredFunnel.length}`);
      console.log(`   💹 Comparison ROI: ${comparisonROI.toFixed(1)}%`);
    }

    const stats: GeneralStats = {
      totalRevenue: currentRevenue,
      activeLeads: allActiveLeads.length, // All active leads regardless of period
      conversionRate: currentConversionRate,
      totalCalls: 0,
      revenueChange: salesComparisonMode ? calculateChange(currentRevenue, comparisonRevenue) : "+0%",
      leadsChange: salesComparisonMode ? calculateChange(allActiveLeads.length, comparisonActiveLeads.length) : "+0%",
      conversionChange: salesComparisonMode ? calculateChange(currentConversionRate, comparisonConversionRate) : "+0%",
      callsChange: "N/A",
      roi: currentROI,
      roiChange: salesComparisonMode ? calculateChange(currentROI, comparisonROI) : "+0%",
      // Comparison data
      totalRevenueComparison: salesComparisonMode ? comparisonRevenue : undefined,
      activeLeadsComparison: salesComparisonMode ? comparisonActiveLeads.length : undefined,
      conversionRateComparison: salesComparisonMode ? comparisonConversionRate : undefined,
      roiComparison: salesComparisonMode ? comparisonROI : undefined,
    };

    return stats;
  }, [allLeads, salesChartPipelineFilter, salesPeriod, salesComparisonMode, salesComparisonPeriod, investmentConfig]);

  // Memoized general stats with ROI calculation (for backward compatibility)
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
          with: ['contacts', 'tags'],
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
      
      let formattedLeads = [
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
          _embedded: {
            tags: lead._embedded?.tags || []
          },
          tags: lead._embedded?.tags || [] // Also add directly for compatibility
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
          _embedded: {
            tags: [] // Unsorted leads typically don't have tags
          },
          tags: [] // Also add directly for compatibility
        }))
      ];

      // Hidratar tags para leads que vieram sem tags do endpoint de listagem
      try {
        const leadsMissingTagsIds = sortedLeads
          .filter((l: any) => !Array.isArray(l._embedded?.tags) || l._embedded?.tags?.length === 0)
          .map((l: any) => l.id);

        if (leadsMissingTagsIds.length > 0) {
          const kommoConfig = JSON.parse(localStorage.getItem('kommoConfig') || '{}');
          const authService = new KommoAuthService(kommoConfig);
          const apiServiceForHydration = new KommoApiService(authService, kommoConfig.accountUrl);

          const batchSize = 50;
          const hydratedMap = new Map<number, any[]>();

          for (let i = 0; i < leadsMissingTagsIds.length; i += batchSize) {
            const batch = leadsMissingTagsIds.slice(i, i + batchSize);
            try {
              const resp = await apiServiceForHydration.getLeadsByIds(batch, ['tags']);
              const leadsWithTags = resp._embedded?.leads || [];
              leadsWithTags.forEach((lead: any) => {
                hydratedMap.set(lead.id, lead._embedded?.tags || []);
              });
            } catch (e) {
              console.warn('⚠️ Falha ao hidratar tags para lote:', batch, e);
            }
          }

          if (hydratedMap.size > 0) {
            formattedLeads = formattedLeads.map((lead: any) => {
              if (typeof lead.id === 'number' && hydratedMap.has(lead.id)) {
                const hydratedTags = hydratedMap.get(lead.id) || [];
                return {
                  ...lead,
                  _embedded: { ...(lead._embedded || {}), tags: hydratedTags },
                  tags: hydratedTags
                };
              }
              return lead;
            });
            console.log('🏷️ Hidratação de tags aplicada a', hydratedMap.size, 'leads');
          }
        }
      } catch (e) {
        console.warn('⚠️ Erro geral na hidratação de tags:', e);
      }

      // Debug log to verify tags are being included
      console.log('🏷️ Leads with tags found:', formattedLeads.filter(lead => lead.tags?.length > 0).length);
      console.log('🏷️ First lead with tags:', formattedLeads.find(lead => lead.tags?.length > 0));

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
    filteredGeneralStats,
    allLeads,
    salesData: filteredSalesData,
    salesChartPipelineFilter,
    setSalesChartPipelineFilter,
    
    // Sales filtering functions
    salesPeriod,
    setSalesPeriod,
    salesComparisonMode,
    setSalesComparisonMode,
    salesComparisonPeriod,
    setSalesComparisonPeriod,
    
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
    
    // Conversion time analysis
    calculateConversionTimeData: useCallback((pipelineId?: number | null): ConversionTimeData | null => {
      if (!allLeads.length || !pipelines.length) return null;

      const currentTime = Date.now();
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline && pipelineId !== null) return null;

      // Filter leads by pipeline
      const filteredLeads = pipelineId === null 
        ? allLeads.filter((lead: any) => !lead.id.toString().startsWith('unsorted-'))
        : allLeads.filter((lead: any) => 
            lead.pipeline_id === pipelineId && 
            !lead.id.toString().startsWith('unsorted-')
          );

      if (filteredLeads.length === 0) return null;

      // Calculate conversion times for closed leads
      const closedLeads = filteredLeads.filter((lead: any) => lead.closed_at);
      const conversionTimes = closedLeads.map((lead: any) => {
        const createdAt = lead.created_at ? new Date(lead.created_at * 1000) : new Date(lead.lastContact);
        const closedAt = new Date(lead.closed_at * 1000);
        return (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24); // days
      });

      // Calculate average times per status (estimated based on current active leads)
      const statusStats = pipeline ? pipeline.statuses.map(status => {
        const statusLeads = filteredLeads.filter((lead: any) => lead.status_id === status.id);
        const avgDays = statusLeads.length > 0 
          ? statusLeads.reduce((sum: number, lead: any) => {
              const createdAt = lead.created_at ? new Date(lead.created_at * 1000) : new Date(lead.lastContact);
              const daysSinceCreated = (currentTime - createdAt.getTime()) / (1000 * 60 * 60 * 24);
              return sum + Math.min(daysSinceCreated, 90); // Cap at 90 days to avoid skewing
            }, 0) / statusLeads.length
          : 0;

        return {
          statusName: status.name,
          avgDays,
          color: status.color
        };
      }) : [];

      // Find stuck leads (more than 30 days in current status)
      const thirtyDaysAgo = currentTime - (30 * 24 * 60 * 60 * 1000);
      const stuckLeads = filteredLeads.filter((lead: any) => {
        const lastUpdate = lead.updated_at ? new Date(lead.updated_at * 1000) : new Date(lead.lastContact);
        return lastUpdate.getTime() < thirtyDaysAgo && !lead.closed_at;
      }).length;

      return {
        averageConversionTime: conversionTimes.length > 0 
          ? conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length 
          : 0,
        averageTimePerStatus: statusStats,
        conversionRate: filteredLeads.length > 0 
          ? (closedLeads.length / filteredLeads.length) * 100 
          : 0,
        stuckLeads,
        totalLeads: filteredLeads.length,
        fastestConversion: conversionTimes.length > 0 ? Math.min(...conversionTimes) : 0,
        slowestConversion: conversionTimes.length > 0 ? Math.max(...conversionTimes) : 0,
      };
    }, [allLeads, pipelines]),

    calculateTimeAnalysisData: useCallback((pipelineId?: number | null): TimeAnalysisData | null => {
      if (!allLeads.length || !pipelines.length) return null;

      const currentTime = Date.now();
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline && pipelineId !== null) return null;

      // Filter leads by pipeline
      const filteredLeads = pipelineId === null 
        ? allLeads.filter((lead: any) => !lead.id.toString().startsWith('unsorted-'))
        : allLeads.filter((lead: any) => 
            lead.pipeline_id === pipelineId && 
            !lead.id.toString().startsWith('unsorted-')
          );

      // Status time data
      const statusTimeData = pipeline ? pipeline.statuses.map(status => {
        const statusLeads = filteredLeads.filter((lead: any) => lead.status_id === status.id);
        const avgDays = statusLeads.length > 0 
          ? statusLeads.reduce((sum: number, lead: any) => {
              const createdAt = lead.created_at ? new Date(lead.created_at * 1000) : new Date(lead.lastContact);
              const daysSinceCreated = (currentTime - createdAt.getTime()) / (1000 * 60 * 60 * 24);
              return sum + Math.min(daysSinceCreated, 90);
            }, 0) / statusLeads.length
          : 0;

        return {
          name: status.name,
          avgDays,
          leadCount: statusLeads.length,
          color: status.color
        };
      }) : [];

      // Conversion distribution
      const closedLeads = filteredLeads.filter((lead: any) => lead.closed_at);
      const conversionTimes = closedLeads.map((lead: any) => {
        const createdAt = lead.created_at ? new Date(lead.created_at * 1000) : new Date(lead.lastContact);
        const closedAt = new Date(lead.closed_at * 1000);
        return (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      });

      const ranges = [
        { label: '0-7 dias', min: 0, max: 7 },
        { label: '1-4 semanas', min: 7, max: 28 },
        { label: '1-3 meses', min: 28, max: 90 },
        { label: '3+ meses', min: 90, max: Infinity }
      ];

      const conversionDistribution = ranges.map(range => {
        const count = conversionTimes.filter(time => time >= range.min && time < range.max).length;
        const percentage = conversionTimes.length > 0 ? (count / conversionTimes.length) * 100 : 0;
        return {
          range: range.label,
          count,
          percentage
        };
      });

      // Critical leads (stuck for more than 30 days)
      const thirtyDaysAgo = currentTime - (30 * 24 * 60 * 60 * 1000);
      const criticalLeads = filteredLeads
        .filter((lead: any) => {
          const lastUpdate = lead.updated_at ? new Date(lead.updated_at * 1000) : new Date(lead.lastContact);
          return lastUpdate.getTime() < thirtyDaysAgo && !lead.closed_at;
        })
        .map((lead: any) => {
          const lastUpdate = lead.updated_at ? new Date(lead.updated_at * 1000) : new Date(lead.lastContact);
          const daysInStatus = (currentTime - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
          return {
            id: lead.id,
            name: lead.name,
            statusName: lead.status_name || lead.stage,
            daysInStatus,
            value: lead.value || 0
          };
        })
        .sort((a, b) => b.daysInStatus - a.daysInStatus)
        .slice(0, 10); // Top 10 most critical

      return {
        statusTimeData,
        conversionDistribution,
        criticalLeads
      };
    }, [allLeads, pipelines]),
  };
};