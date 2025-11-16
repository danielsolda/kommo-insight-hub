import { useMemo } from 'react';
import { Lead, Note, User } from '@/services/kommoApi';

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
  notes: Note[],
  users: User[]
) => {
  // Calcular tempo de resposta por lead
  const leadsWithResponseTime = useMemo(() => {
    return leads.map(lead => {
      // Filtrar notas do lead que foram criadas pelo vendedor responsável
      // Considerar apenas notas relevantes (não automáticas)
      const relevantNoteTypes = ['call_out', 'call_in', 'sms_out', 'common', 'mail_out'];
      
      const leadNotes = notes
        .filter(note => note.entity_id === lead.id)
        .filter(note => note.created_by === lead.responsible_user_id)
        .filter(note => relevantNoteTypes.includes(note.note_type))
        .sort((a, b) => a.created_at - b.created_at);
      
      const firstNote = leadNotes[0];
      const hasResponse = !!firstNote;
      const responseTime = hasResponse 
        ? (firstNote.created_at - lead.created_at) / 3600 // converter para horas
        : null;
      
      return {
        leadId: lead.id,
        leadName: lead.name,
        createdAt: lead.created_at,
        firstResponseAt: firstNote?.created_at || null,
        responseTime,
        responsibleUserId: lead.responsible_user_id,
        hasResponse
      } as LeadResponseData;
    });
  }, [leads, notes]);

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
