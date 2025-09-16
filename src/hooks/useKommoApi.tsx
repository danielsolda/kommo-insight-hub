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

export const useKommoApi = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchPipelineStats(selectedPipeline);
    }
  }, [selectedPipeline]);

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

      // Fetch leads for this pipeline
      const leadsResponse = await apiService.getLeads({
        filter: { pipeline_id: pipelineId },
        limit: 250 // Get more leads to have better stats
      });

      const leads = leadsResponse._embedded?.leads || [];
      const pipeline = pipelines.find(p => p.id === pipelineId);
      
      if (!pipeline) return;

      // Calculate stats by status
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

  const refreshData = async () => {
    await fetchPipelines();
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
  };
};