import { useMemo } from 'react';
import { isWithinInterval } from 'date-fns';
import type { Lead } from '@/services/kommoApi';
import type { Goal } from './useGoals';

interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  remaining: number;
}

export const useGoalProgress = (goals: Goal[], leads: Lead[]): Map<string, GoalProgress> => {
  return useMemo(() => {
    const progressMap = new Map<string, GoalProgress>();

    goals.forEach(goal => {
      const goalStart = new Date(goal.start_date);
      const goalEnd = new Date(goal.end_date);

      // Filtrar leads dentro do período da meta
      let filteredLeads = leads.filter(lead => {
        const leadDate = new Date(lead.created_at * 1000);
        return isWithinInterval(leadDate, { start: goalStart, end: goalEnd });
      });

      // Filtrar por status se especificado
      if (goal.status_ids && goal.status_ids.length > 0) {
        filteredLeads = filteredLeads.filter(lead =>
          goal.status_ids.includes(lead.status_id)
        );
      }

      // Filtrar por pipeline se especificado
      if (goal.pipeline_ids && goal.pipeline_ids.length > 0) {
        filteredLeads = filteredLeads.filter(lead =>
          goal.pipeline_ids.includes(lead.pipeline_id)
        );
      }

      // Filtrar por vendedor se especificado
      if (goal.seller_id) {
        filteredLeads = filteredLeads.filter(lead =>
          lead.responsible_user_id === goal.seller_id
        );
      }

      // Filtrar por produto (campo customizado) se especificado
      if (goal.product_name) {
        filteredLeads = filteredLeads.filter(lead => {
          const customFields = lead.custom_fields_values || [];
          return customFields.some(field => {
            const fieldValue = field.values?.[0]?.value || field.values?.[0]?.enum_code || "";
            return String(fieldValue).toLowerCase().includes(goal.product_name!.toLowerCase());
          });
        });
      }

      // Calcular valor atual
      let currentValue = 0;
      if (goal.target_type === 'quantity') {
        currentValue = filteredLeads.length;
      } else if (goal.target_type === 'value') {
        currentValue = filteredLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);
      }

      const progressPercentage = goal.target_value > 0
        ? Math.min((currentValue / goal.target_value) * 100, 100)
        : 0;

      const remaining = Math.max(goal.target_value - currentValue, 0);

      progressMap.set(goal.id, {
        goalId: goal.id,
        currentValue,
        targetValue: goal.target_value,
        progressPercentage,
        isCompleted: currentValue >= goal.target_value,
        remaining,
      });
    });

    return progressMap;
  }, [goals, leads]);
};
