import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type GoalType = 'product' | 'seller' | 'team';
export type GoalTargetType = 'quantity' | 'value';
export type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface Goal {
  id: string;
  name: string;
  description?: string;
  type: GoalType;
  target_type: GoalTargetType;
  target_value: number;
  period: GoalPeriod;
  start_date: string;
  end_date: string;
  product_name?: string;
  seller_id?: number;
  seller_name?: string;
  status_ids: number[];
  pipeline_ids: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  type: GoalType;
  target_type: GoalTargetType;
  target_value: number;
  period: GoalPeriod;
  start_date: string;
  end_date: string;
  product_name?: string;
  seller_id?: number;
  seller_name?: string;
  status_ids?: number[];
  pipeline_ids?: number[];
  is_active?: boolean;
}

export const useGoals = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
  });

  const createGoal = useMutation({
    mutationFn: async (goal: CreateGoalInput) => {
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goal, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
      toast.error('Erro ao criar meta');
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateGoalInput> }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      toast.error('Erro ao atualizar meta');
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting goal:', error);
      toast.error('Erro ao excluir meta');
    },
  });

  const toggleGoalStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('goals')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Status da meta atualizado!');
    },
    onError: (error) => {
      console.error('Error toggling goal status:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  return {
    goals: goals || [],
    isLoading,
    createGoal: createGoal.mutateAsync,
    updateGoal: updateGoal.mutateAsync,
    deleteGoal: deleteGoal.mutateAsync,
    toggleGoalStatus: toggleGoalStatus.mutateAsync,
  };
};
