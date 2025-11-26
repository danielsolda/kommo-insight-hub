import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, TrendingUp, Calendar, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGoals } from "@/hooks/useGoals";
import { useGoalProgress } from "@/hooks/useGoalProgress";
import { GoalsConfig } from "./GoalsConfig";
import type { Lead, Pipeline } from "@/services/kommoApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GoalsDashboardProps {
  leads: Lead[];
  pipelines: Pipeline[];
  sellers: Array<{ id: number; name: string }>;
  customFields: any[];
}

export const GoalsDashboard = ({
  leads,
  pipelines,
  sellers,
  customFields,
}: GoalsDashboardProps) => {
  const [showConfig, setShowConfig] = useState(false);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  
  const { goals, isLoading, createGoal, deleteGoal, toggleGoalStatus } = useGoals();
  const progressMap = useGoalProgress(goals, leads);

  const activeGoals = goals.filter(g => g.is_active);
  const inactiveGoals = goals.filter(g => !g.is_active);

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'product': return '🎯 Produto';
      case 'seller': return '👤 Vendedor';
      case 'team': return '👥 Equipe';
      default: return type;
    }
  };

  const getTargetTypeLabel = (type: string) => {
    return type === 'quantity' ? 'Quantidade' : 'Valor (R$)';
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      weekly: 'Semanal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual',
      custom: 'Personalizado',
    };
    return labels[period] || period;
  };

  const formatValue = (value: number, targetType: string) => {
    if (targetType === 'value') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  const handleDelete = async (id: string) => {
    await deleteGoal(id);
    setDeleteGoalId(null);
  };

  const GoalCard = ({ goal }: { goal: any }) => {
    const progress = progressMap.get(goal.id);
    if (!progress) return null;

    const progressColor = progress.isCompleted
      ? 'text-success'
      : progress.progressPercentage >= 75
      ? 'text-warning'
      : 'text-info';

    return (
      <Card className="bg-gradient-card border-border/50 shadow-card hover:shadow-elegant transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{goal.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {getGoalTypeLabel(goal.type)}
                </Badge>
              </div>
              {goal.description && (
                <CardDescription className="text-sm">{goal.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleGoalStatus({ id: goal.id, is_active: !goal.is_active })}
                title={goal.is_active ? 'Desativar' : 'Ativar'}
              >
                {goal.is_active ? (
                  <ToggleRight className="h-4 w-4 text-success" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDeleteGoalId(goal.id)}
                title="Excluir"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{getTargetTypeLabel(goal.target_type)}</span>
              <span className={`font-semibold ${progressColor}`}>
                {progress.progressPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={progress.progressPercentage} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {formatValue(progress.currentValue, goal.target_type)} de{' '}
                {formatValue(progress.targetValue, goal.target_type)}
              </span>
              {!progress.isCompleted && (
                <span className="text-muted-foreground">
                  Faltam {formatValue(progress.remaining, goal.target_type)}
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Período</div>
                <div className="font-medium">{getPeriodLabel(goal.period)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Datas</div>
                <div className="font-medium text-xs">
                  {format(new Date(goal.start_date), 'dd/MM', { locale: ptBR })} -{' '}
                  {format(new Date(goal.end_date), 'dd/MM/yy', { locale: ptBR })}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {goal.seller_name && (
            <div className="text-sm">
              <span className="text-muted-foreground">Vendedor: </span>
              <span className="font-medium">{goal.seller_name}</span>
            </div>
          )}
          {goal.product_name && (
            <div className="text-sm">
              <span className="text-muted-foreground">Produto: </span>
              <span className="font-medium">{goal.product_name}</span>
            </div>
          )}

          {/* Status Badge */}
          {progress.isCompleted && (
            <Badge className="w-full justify-center bg-success/20 text-success hover:bg-success/30">
              ✓ Meta Atingida!
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando metas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Metas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe o progresso das metas configuradas
            </p>
          </div>
          <Button onClick={() => setShowConfig(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Meta
          </Button>
        </div>

        {activeGoals.length === 0 && inactiveGoals.length === 0 ? (
          <Card className="bg-gradient-card border-border/50 border-dashed">
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma meta configurada</h3>
              <p className="text-muted-foreground mb-6">
                Crie metas personalizadas para acompanhar o desempenho da sua equipe
              </p>
              <Button onClick={() => setShowConfig(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeGoals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Metas Ativas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeGoals.map(goal => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              </div>
            )}

            {inactiveGoals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Metas Inativas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inactiveGoals.map(goal => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <GoalsConfig
        open={showConfig}
        onOpenChange={setShowConfig}
        onSave={createGoal}
        pipelines={pipelines}
        sellers={sellers}
        customFields={customFields}
      />

      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGoalId && handleDelete(deleteGoalId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
