import { useMemo } from 'react';
import { useGlobalFilters } from '@/contexts/FilterContext';
import { Lead, Pipeline, User } from '@/services/kommoApi';
import { isWithinInterval, parseISO } from 'date-fns';

export const useFilteredLeads = (leads: Lead[] | undefined) => {
  const { filters } = useGlobalFilters();
  
  return useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(lead => {
      // Filter by date range
      if (lead.created_at) {
        try {
          const leadDate = typeof lead.created_at === 'string' 
            ? parseISO(lead.created_at) 
            : new Date(lead.created_at);
          
          if (!isWithinInterval(leadDate, {
            start: filters.dateRange.from,
            end: filters.dateRange.to
          })) {
            return false;
          }
        } catch (error) {
          console.warn('Error parsing lead date:', error);
        }
      }
      
      // Filter by pipeline
      if (filters.pipelineId !== null && lead.pipeline_id !== filters.pipelineId) {
        return false;
      }
      
      // Filter by user
      if (filters.userId !== null && lead.responsible_user_id !== filters.userId) {
        return false;
      }
      
      return true;
    });
  }, [leads, filters]);
};

export const useFilteredPipelines = (pipelines: Pipeline[] | undefined) => {
  const { filters } = useGlobalFilters();
  
  return useMemo(() => {
    if (!pipelines) return [];
    
    if (filters.pipelineId === null) {
      return pipelines;
    }
    
    return pipelines.filter(p => p.id === filters.pipelineId);
  }, [pipelines, filters.pipelineId]);
};

export const useFilteredUsers = (users: User[] | undefined) => {
  const { filters } = useGlobalFilters();
  
  return useMemo(() => {
    if (!users) return [];
    
    if (filters.userId === null) {
      return users;
    }
    
    return users.filter(u => u.id === filters.userId);
  }, [users, filters.userId]);
};

// Helper to check if a date string is within the filter range
export const isDateInFilterRange = (dateString: string | number | Date | undefined, dateRange: { from: Date; to: Date }): boolean => {
  if (!dateString) return false;
  
  try {
    const date = typeof dateString === 'string' 
      ? parseISO(dateString) 
      : new Date(dateString);
    
    return isWithinInterval(date, {
      start: dateRange.from,
      end: dateRange.to
    });
  } catch (error) {
    console.warn('Error checking date range:', error);
    return false;
  }
};
