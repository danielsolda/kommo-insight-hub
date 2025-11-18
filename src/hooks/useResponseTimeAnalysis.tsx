import { useMemo } from 'react';
import { Lead, Event, User } from '@/services/kommoApi';

export interface ResponseTimeMetrics {
  userId: number;
  userName: string;
  averageResponseTime: number;
  fastestResponse: number;
  slowestResponse: number;
  totalLeadsResponded: number;
  leadsWithoutResponse: number;
  responseRate: number;
}

export interface LeadResponseData {
  leadId: number;
  leadName: string;
  createdAt: number;
  firstResponseAt: number | null;
  responseTime: number | null;
  responsibleUserId: number;
  hasResponse: boolean;
}

export const useResponseTimeAnalysis = (
  leads: Lead[],
  events: Event[],
  users: User[]
) => {
  // Calcular tempo de resposta por lead usando Events API
  const leadsWithResponseTime = useMemo(() => {
    return leads.map(lead => {
      // Tipos de eventos que representam respostas ativas do vendedor
      const RESPONSE_EVENT_TYPES = [
        'outgoing_chat_message',  // Mensagem enviada (WhatsApp, chat)
        'outgoing_call',          // Ligação feita
        'outgoing_sms',           // SMS enviado
        'outgoing_mail'           // E-mail enviado
      ];
      
      const responseEvents = events
        .filter(e => e.entity_id === lead.id)
        .filter(e => e.entity_type === 'leads')
        .filter(e => e.created_by === lead.responsible_user_id)
        .filter(e => RESPONSE_EVENT_TYPES.includes(e.type))
        .sort((a, b) => a.created_at - b.created_at);
      
      const firstResponse = responseEvents[0];
      const hasResponse = !!firstResponse;
      const responseTime = hasResponse 
        ? (firstResponse.created_at - lead.created_at) / 3600 // converter para horas
        : null;
      
      return {
        leadId: lead.id,
        leadName: lead.name,
        createdAt: lead.created_at,
        firstResponseAt: firstResponse?.created_at || null,
        responseTime,
        responsibleUserId: lead.responsible_user_id,
        hasResponse
      } as LeadResponseData;
    });
  }, [leads, events]);

  // Calcular métricas por vendedor
  const responseMetricsByUser = useMemo(() => {
    const metrics = new Map<number, ResponseTimeMetrics>();
    
    users.forEach(user => {
      const userLeads = leadsWithResponseTime.filter(
        l => l.responsibleUserId === user.id
      );
      
      const leadsWithResponse = userLeads.filter(l => l.hasResponse);
      const responseTimes = leadsWithResponse
        .map(l => l.responseTime!)
        .filter(t => t !== null && t > 0); // Filtrar tempos negativos ou nulos
      
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;
      
      metrics.set(user.id, {
        userId: user.id,
        userName: user.name,
        averageResponseTime: avgResponseTime,
        fastestResponse: responseTimes.length > 0 
          ? Math.min(...responseTimes) 
          : 0,
        slowestResponse: responseTimes.length > 0 
          ? Math.max(...responseTimes) 
          : 0,
        totalLeadsResponded: leadsWithResponse.length,
        leadsWithoutResponse: userLeads.length - leadsWithResponse.length,
        responseRate: userLeads.length > 0 
          ? (leadsWithResponse.length / userLeads.length) * 100 
          : 0
      });
    });
    
    return Array.from(metrics.values()).filter(m => m.averageResponseTime > 0 || m.leadsWithoutResponse > 0);
  }, [leadsWithResponseTime, users]);

  const overallMetrics = useMemo(() => {
    const totalLeadsWithResponse = leadsWithResponseTime.filter(l => l.hasResponse).length;
    const avgTime = responseMetricsByUser.length > 0
      ? responseMetricsByUser.reduce((sum, m) => sum + m.averageResponseTime, 0) / responseMetricsByUser.length
      : 0;

    return {
      avgResponseTime: avgTime,
      totalLeadsAnalyzed: leadsWithResponseTime.length,
      totalLeadsWithResponse,
      responseRate: leadsWithResponseTime.length > 0
        ? (totalLeadsWithResponse / leadsWithResponseTime.length) * 100
        : 0
    };
  }, [leadsWithResponseTime, responseMetricsByUser]);

  return {
    leadsWithResponseTime,
    responseMetricsByUser,
    overallMetrics
  };
};
