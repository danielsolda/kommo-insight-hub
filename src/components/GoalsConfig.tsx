import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CreateGoalInput, GoalType, GoalTargetType, GoalPeriod } from "@/hooks/useGoals";
import type { Pipeline, Status } from "@/services/kommoApi";

interface GoalsConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goal: CreateGoalInput) => Promise<any>;
  pipelines: Pipeline[];
  sellers: Array<{ id: number; name: string }>;
  customFields: any[];
}

const GOAL_TYPES: Array<{ value: GoalType; label: string; description: string }> = [
  { value: 'product', label: '🎯 Por Produto', description: 'Meta baseada em produto específico' },
  { value: 'seller', label: '👤 Por Vendedor', description: 'Meta individual de vendedor' },
  { value: 'team', label: '👥 Por Equipe', description: 'Meta coletiva da equipe' },
];

const TARGET_TYPES: Array<{ value: GoalTargetType; label: string }> = [
  { value: 'quantity', label: 'Quantidade de Vendas' },
  { value: 'value', label: 'Valor Total (R$)' },
];

const PERIODS: Array<{ value: GoalPeriod; label: string }> = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

export const GoalsConfig = ({
  open,
  onOpenChange,
  onSave,
  pipelines,
  sellers,
  customFields,
}: GoalsConfigProps) => {
  const [formData, setFormData] = useState<CreateGoalInput>({
    name: '',
    description: '',
    type: 'team',
    target_type: 'quantity',
    target_value: 0,
    period: 'monthly',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    status_ids: [],
    pipeline_ids: [],
    is_active: true,
  });

  const [selectedPipelineForStatus, setSelectedPipelineForStatus] = useState<number | null>(null);

  const allStatuses = pipelines.flatMap(p =>
    (p.statuses || []).map((s: Status) => ({
      ...s,
      pipelineName: p.name,
      pipelineId: p.id,
    }))
  );

  const handleSubmit = async () => {
    if (!formData.name || formData.target_value <= 0) {
      return;
    }

    try {
      await onSave(formData);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'team',
        target_type: 'quantity',
        target_value: 0,
        period: 'monthly',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        status_ids: [],
        pipeline_ids: [],
        is_active: true,
      });
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const toggleStatus = (statusId: number) => {
    setFormData(prev => ({
      ...prev,
      status_ids: prev.status_ids?.includes(statusId)
        ? prev.status_ids.filter(id => id !== statusId)
        : [...(prev.status_ids || []), statusId],
    }));
  };

  const togglePipeline = (pipelineId: number) => {
    setFormData(prev => ({
      ...prev,
      pipeline_ids: prev.pipeline_ids?.includes(pipelineId)
        ? prev.pipeline_ids.filter(id => id !== pipelineId)
        : [...(prev.pipeline_ids || []), pipelineId],
    }));
  };

  const filteredStatuses = selectedPipelineForStatus
    ? allStatuses.filter(s => s.pipelineId === selectedPipelineForStatus)
    : allStatuses;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nova Meta</DialogTitle>
          <DialogDescription>
            Configure uma nova meta para acompanhar o desempenho
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Nome e Descrição */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="name">Nome da Meta *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Meta de vendas Q1 2025"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes sobre a meta..."
                  rows={2}
                />
              </div>
            </div>

            {/* Tipo de Meta */}
            <div className="space-y-3">
              <Label>Tipo de Meta *</Label>
              <div className="grid grid-cols-3 gap-3">
                {GOAL_TYPES.map(type => (
                  <div
                    key={type.value}
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      formData.type === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipo de Objetivo */}
            <div className="space-y-3">
              <Label>Tipo de Objetivo *</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value: GoalTargetType) =>
                  setFormData({ ...formData, target_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor Alvo */}
            <div>
              <Label htmlFor="target_value">
                Valor Alvo * {formData.target_type === 'value' && '(R$)'}
              </Label>
              <Input
                id="target_value"
                type="number"
                value={formData.target_value}
                onChange={(e) =>
                  setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })
                }
                min="0"
                step={formData.target_type === 'value' ? '0.01' : '1'}
              />
            </div>

            {/* Período */}
            <div className="space-y-3">
              <Label>Período *</Label>
              <Select
                value={formData.period}
                onValueChange={(value: GoalPeriod) => setFormData({ ...formData, period: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map(period => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Data Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data Fim *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Vendedor (se tipo = seller) */}
            {formData.type === 'seller' && (
              <div className="space-y-3">
                <Label>Vendedor *</Label>
                <Select
                  value={formData.seller_id?.toString() || ''}
                  onValueChange={(value) => {
                    const seller = sellers.find(s => s.id === parseInt(value));
                    setFormData({
                      ...formData,
                      seller_id: parseInt(value),
                      seller_name: seller?.name,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.filter(s => s.id != null).map(seller => (
                      <SelectItem key={seller.id} value={String(seller.id)}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Produto (se tipo = product) */}
            {formData.type === 'product' && (
              <div>
                <Label htmlFor="product_name">Nome do Produto *</Label>
                <Input
                  id="product_name"
                  value={formData.product_name || ''}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Ex: Plano Premium"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Será usado para filtrar leads por campos customizados
                </p>
              </div>
            )}

            {/* Pipelines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pipelines (opcional)</Label>
                <Badge variant="secondary" className="text-xs">
                  {formData.pipeline_ids?.length || 0} selecionado(s)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Filtrar leads por pipeline específico
              </p>
              <div className="space-y-2">
                {pipelines.map(pipeline => (
                  <div key={pipeline.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pipeline-${pipeline.id}`}
                      checked={formData.pipeline_ids?.includes(pipeline.id)}
                      onCheckedChange={() => togglePipeline(pipeline.id)}
                    />
                    <label
                      htmlFor={`pipeline-${pipeline.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {pipeline.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Status que contam para a meta (opcional)</Label>
                <Badge variant="secondary" className="text-xs">
                  {formData.status_ids?.length || 0} selecionado(s)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Apenas leads com estes status serão contabilizados
              </p>
              
              {pipelines.length > 1 && (
                <Select
                  value={selectedPipelineForStatus?.toString() || 'all'}
                  onValueChange={(value) =>
                    setSelectedPipelineForStatus(value === 'all' ? null : parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por pipeline..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os pipelines</SelectItem>
                    {pipelines.filter(p => p.id != null).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="space-y-2">
                  {filteredStatuses.map(status => (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.id}`}
                        checked={formData.status_ids?.includes(status.id)}
                        onCheckedChange={() => toggleStatus(status.id)}
                      />
                      <label
                        htmlFor={`status-${status.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {status.name}{' '}
                        <span className="text-muted-foreground text-xs">
                          ({status.pipelineName})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || formData.target_value <= 0}
          >
            Criar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
