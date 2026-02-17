import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KommoAuthService } from '@/services/kommoAuth';
import { useToast } from '@/hooks/use-toast';

export interface UserResponseMetrics {
  responsibleUserId: number;
  responsibleUserName: string;
  avgResponseMinutes: number;
  medianResponseMinutes: number;
  p90ResponseMinutes: number;
  totalMessages: number;
  withinSla: number;
  slaRate: number;
}

export interface OverallResponseMetrics {
  avgResponseMinutes: number;
  medianResponseMinutes: number;
  p90ResponseMinutes: number;
  totalPairs: number;
  withinSla: number;
  slaRate: number;
}

export interface ResponseTimeData {
  userMetrics: UserResponseMetrics[];
  overall: OverallResponseMetrics;
  totalEventsProcessed: number;
  slaMinutes: number;
}

export const useResponseTimeData = () => {
  const [data, setData] = useState<ResponseTimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchResponseTime = useCallback(async (users: Array<{ id: number; name: string }>) => {
    setLoading(true);
    setError(null);

    try {
      // Get auth tokens
      const configStr = localStorage.getItem('kommoConfig');
      const tokensStr = localStorage.getItem('kommoTokens');
      if (!configStr || !tokensStr) {
        throw new Error('Configuração Kommo não encontrada');
      }

      const config = JSON.parse(configStr);
      const authService = new KommoAuthService(config);
      const tokens = await authService.getValidTokens();
      if (!tokens) throw new Error('Token inválido');

      // Last 30 days
      const now = Math.floor(Date.now() / 1000);
      const fromTimestamp = now - (30 * 24 * 60 * 60);

      const { data: result, error: fnError } = await supabase.functions.invoke('kommo-response-time', {
        body: {
          accessToken: tokens.accessToken,
          accountUrl: config.accountUrl,
          fromTimestamp,
          toTimestamp: now
        }
      });

      if (fnError) throw new Error(fnError.message || 'Erro ao buscar dados');

      // Map user names to metrics
      const userMap = new Map(users.map(u => [u.id, u.name]));
      const enrichedMetrics: UserResponseMetrics[] = (result.userMetrics || []).map((m: any) => ({
        ...m,
        responsibleUserName: userMap.get(m.responsibleUserId) || `Usuário ${m.responsibleUserId}`
      }));

      setData({
        ...result,
        userMetrics: enrichedMetrics
      });
    } catch (err: any) {
      console.error('Response time fetch error:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar tempo de resposta',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { data, loading, error, fetchResponseTime };
};
