import { useMemo } from 'react';
import { Lead, Pipeline } from '@/services/kommoApi';

export interface ConversionStep {
  fromStatusId: number;
  fromStatusName: string;
  toStatusId: number;
  toStatusName: string;
  totalLeadsAtStart: number;
  convertedLeads: number;
  conversionRate: number;
  avgTransitionTime: number;
  droppedLeads: number;
  dropoffRate: number;
  bottleneckSeverity: 'low' | 'medium' | 'high';
  color: string;
}

export interface FunnelBenchmark {
  statusId: number;
  statusName: string;
  avgTimeInStatus: number;
  benchmark: number;
  performanceRatio: number;
  status: 'excellent' | 'good' | 'attention' | 'critical';
}

const getConversionColor = (rate: number): string => {
  if (rate >= 85) return 'hsl(var(--success))';
  if (rate >= 70) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
};

const getPerformanceStatus = (ratio: number): 'excellent' | 'good' | 'attention' | 'critical' => {
  if (ratio <= 1.1) return 'excellent';
  if (ratio <= 1.3) return 'good';
  if (ratio <= 1.5) return 'attention';
  return 'critical';
};

export const useFunnelAnalytics = (leads: Lead[], pipelines: Pipeline[]) => {
  const calculateStepConversions = useMemo(() => {
    return (pipelineId: number): ConversionStep[] => {
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline || !pipeline.statuses) return [];

      const statuses = [...pipeline.statuses].sort((a, b) => a.sort - b.sort);
      const pipelineLeads = leads.filter(l => l.pipeline_id === pipelineId);
      const steps: ConversionStep[] = [];

      console.log(`📊 Analisando pipeline: ${pipeline.name}`);
      console.log(`   Total de leads: ${pipelineLeads.length}`);
      console.log(`   Status no pipeline: ${statuses.length}`);
      console.log('🔍 DEBUG - Leads por status:');
      statuses.forEach(status => {
        const count = pipelineLeads.filter(l => l.status_id === status.id).length;
        console.log(`   ${status.name} (sort: ${status.sort}): ${count} leads`);
      });

      for (let i = 0; i < statuses.length - 1; i++) {
        const fromStatus = statuses[i];
        const toStatus = statuses[i + 1];

        // Nova lógica: Contar leads que alcançaram ou passaram por cada status
        // Leads que chegaram em fromStatus ou além
        const leadsReachedFromStatus = pipelineLeads.filter(lead => {
          const leadStatus = statuses.find(s => s.id === lead.status_id);
          if (!leadStatus) return false;
          
          // Lead está em fromStatus ou em status posterior (ou fechado)
          return leadStatus.sort >= fromStatus.sort || !!lead.closed_at;
        });
        
        const totalLeadsAtStart = leadsReachedFromStatus.length;

        // Leads que chegaram em toStatus ou além
        const leadsReachedToStatus = pipelineLeads.filter(lead => {
          const leadStatus = statuses.find(s => s.id === lead.status_id);
          if (!leadStatus) return false;
          
          // Lead está em toStatus ou em status posterior (ou fechado)
          return leadStatus.sort >= toStatus.sort || !!lead.closed_at;
        });
        
        const convertedLeads = leadsReachedToStatus.length;

        // Taxa de conversão
        const conversionRate = totalLeadsAtStart > 0 
          ? (convertedLeads / totalLeadsAtStart) * 100 
          : 0;

        // Leads que não avançaram além de fromStatus
        const droppedLeads = totalLeadsAtStart - convertedLeads;
        const dropoffRate = totalLeadsAtStart > 0 
          ? (droppedLeads / totalLeadsAtStart) * 100 
          : 0;

        // Tempo médio: calcular apenas para leads que ESTÃO em fromStatus
        const leadsCurrentlyInFromStatus = pipelineLeads.filter(l => l.status_id === fromStatus.id);
        const now = Date.now();
        const times = leadsCurrentlyInFromStatus.map(lead => {
          const updateTime = typeof lead.updated_at === 'number' 
            ? lead.updated_at * 1000 
            : new Date(lead.updated_at).getTime();
          return (now - updateTime) / (24 * 60 * 60 * 1000);
        });
        const avgTransitionTime = times.length > 0 
          ? times.reduce((a, b) => a + b, 0) / times.length 
          : 0;

        let bottleneckSeverity: 'low' | 'medium' | 'high' = 'low';
        if (conversionRate < 70) bottleneckSeverity = 'high';
        else if (conversionRate < 85) bottleneckSeverity = 'medium';

        console.log(`   ${fromStatus.name} → ${toStatus.name}:`);
        console.log(`      Leads reached from: ${totalLeadsAtStart}`);
        console.log(`      Leads reached to: ${convertedLeads}`);
        console.log(`      Conversion: ${conversionRate.toFixed(1)}%`);

        steps.push({
          fromStatusId: fromStatus.id,
          fromStatusName: fromStatus.name,
          toStatusId: toStatus.id,
          toStatusName: toStatus.name,
          totalLeadsAtStart,
          convertedLeads,
          conversionRate,
          avgTransitionTime,
          droppedLeads,
          dropoffRate,
          bottleneckSeverity,
          color: getConversionColor(conversionRate)
        });
      }

      return steps;
    };
  }, [leads, pipelines]);

  const calculateBenchmarks = useMemo(() => {
    return (pipelineId: number): FunnelBenchmark[] => {
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline || !pipeline.statuses) return [];

      const statuses = pipeline.statuses;
      const pipelineLeads = leads.filter(l => l.pipeline_id === pipelineId);
      const now = Date.now();

      return statuses.map(status => {
        const leadsInStatus = pipelineLeads.filter(l => l.status_id === status.id);

        const timeInStatusArray = leadsInStatus.map(lead => {
          const updateTime = typeof lead.updated_at === 'number' 
            ? lead.updated_at * 1000 
            : new Date(lead.updated_at).getTime();
          return (now - updateTime) / (24 * 60 * 60 * 1000);
        });

        const avgTimeInStatus = timeInStatusArray.length > 0 
          ? timeInStatusArray.reduce((a, b) => a + b, 0) / timeInStatusArray.length 
          : 0;

        // Benchmark = mediana
        const sortedTimes = [...timeInStatusArray].sort((a, b) => a - b);
        const benchmark = sortedTimes.length > 0 
          ? sortedTimes[Math.floor(sortedTimes.length / 2)] 
          : avgTimeInStatus || 1;

        const performanceRatio = benchmark > 0 ? avgTimeInStatus / benchmark : 1;

        return {
          statusId: status.id,
          statusName: status.name,
          avgTimeInStatus,
          benchmark,
          performanceRatio,
          status: getPerformanceStatus(performanceRatio)
        };
      });
    };
  }, [leads, pipelines]);

  const identifyBottlenecks = useMemo(() => {
    return (pipelineId: number): ConversionStep[] => {
      const conversions = calculateStepConversions(pipelineId);
      
      // Ordenar por taxa de conversão (menor primeiro) e pegar top 3
      const sortedByConversion = [...conversions]
        .sort((a, b) => a.conversionRate - b.conversionRate)
        .slice(0, 3);

      // Ordenar por tempo (maior primeiro) e pegar top 3
      const sortedByTime = [...conversions]
        .sort((a, b) => b.avgTransitionTime - a.avgTransitionTime)
        .slice(0, 3);

      // Combinar e remover duplicatas
      const bottleneckIds = new Set([
        ...sortedByConversion.map(c => c.fromStatusId),
        ...sortedByTime.map(c => c.fromStatusId)
      ]);

      return conversions.filter(c => bottleneckIds.has(c.fromStatusId));
    };
  }, [calculateStepConversions]);

  return {
    calculateStepConversions,
    calculateBenchmarks,
    identifyBottlenecks
  };
};
