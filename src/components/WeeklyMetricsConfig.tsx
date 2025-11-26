import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

export interface WeeklyMetricsConfig {
  trafficField: {
    fieldId: number | null;
    fieldName: string;
    values: string[];
  };
  appointmentStatusIds: number[];
  attendanceStatusIds: number[];
  closedWonStatusIds: number[];
}

interface WeeklyMetricsConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customFields: any[];
  pipelines: any[];
  onSave: (config: WeeklyMetricsConfig) => void;
}

const DEFAULT_CONFIG: WeeklyMetricsConfig = {
  trafficField: {
    fieldId: null,
    fieldName: "",
    values: []
  },
  appointmentStatusIds: [],
  attendanceStatusIds: [],
  closedWonStatusIds: [142] // Default: Venda Ganha
};

export const WeeklyMetricsConfigModal = ({
  open,
  onOpenChange,
  customFields,
  pipelines,
  onSave
}: WeeklyMetricsConfigModalProps) => {
  const [config, setConfig] = useState<WeeklyMetricsConfig>(DEFAULT_CONFIG);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [availableValues, setAvailableValues] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('weekly-metrics-config');
    if (stored) {
      setConfig(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (config.trafficField.fieldId) {
      const field = customFields.find(f => f.id === config.trafficField.fieldId);
      setSelectedField(field);
      
      if (field?.enums) {
        const enumValues = Object.values(field.enums).map((e: any) => e.value || e);
        setAvailableValues(enumValues);
      }
    }
  }, [config.trafficField.fieldId, customFields]);

  const handleFieldChange = (fieldId: string) => {
    const field = customFields.find(f => f.id === parseInt(fieldId));
    if (field) {
      setConfig({
        ...config,
        trafficField: {
          fieldId: field.id,
          fieldName: field.name,
          values: []
        }
      });
    }
  };

  const toggleTrafficValue = (value: string) => {
    setConfig({
      ...config,
      trafficField: {
        ...config.trafficField,
        values: config.trafficField.values.includes(value)
          ? config.trafficField.values.filter(v => v !== value)
          : [...config.trafficField.values, value]
      }
    });
  };

  const toggleStatus = (statusId: number, type: 'appointment' | 'attendance' | 'closed') => {
    const key = type === 'appointment' ? 'appointmentStatusIds' 
      : type === 'attendance' ? 'attendanceStatusIds' 
      : 'closedWonStatusIds';
    
    setConfig({
      ...config,
      [key]: config[key].includes(statusId)
        ? config[key].filter(id => id !== statusId)
        : [...config[key], statusId]
    });
  };

  const handleSave = () => {
    localStorage.setItem('weekly-metrics-config', JSON.stringify(config));
    onSave(config);
    onOpenChange(false);
  };

  const allStatuses = pipelines.flatMap(p => 
    (p.statuses || []).map((s: any) => ({
      ...s,
      pipelineName: p.name
    }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Configurar Resumo Semanal</DialogTitle>
          <DialogDescription>
            Configure os campos e status para calcular as métricas semanais do seu funil de vendas
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Campo de Tráfego */}
            <div className="space-y-3">
              <Label>📊 Campo "Fonte do Lead" (Tráfego)</Label>
              <p className="text-xs text-muted-foreground">
                Selecione o campo customizado que identifica a origem dos leads de tráfego pago
              </p>
              <Select 
                value={config.trafficField.fieldId?.toString() || ""} 
                onValueChange={handleFieldChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o campo customizado..." />
                </SelectTrigger>
                <SelectContent>
                  {customFields.map(field => (
                    <SelectItem key={field.id} value={field.id.toString()}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {availableValues.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Selecione os valores que identificam leads de tráfego:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableValues.map(value => (
                      <Badge
                        key={value}
                        variant={config.trafficField.values.includes(value) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/90"
                        onClick={() => toggleTrafficValue(value)}
                      >
                        {value}
                        {config.trafficField.values.includes(value) && (
                          <X className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status de Agendamento */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>📅 Status de Agendamento</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {config.appointmentStatusIds.length} selecionado{config.appointmentStatusIds.length !== 1 ? 's' : ''}
                  </Badge>
                  {config.appointmentStatusIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setConfig({ ...config, appointmentStatusIds: [] })}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Status que indicam que uma consulta foi agendada
              </p>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-2">
                  {allStatuses.map(status => (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`appt-${status.id}`}
                        checked={config.appointmentStatusIds.includes(status.id)}
                        onCheckedChange={() => toggleStatus(status.id, 'appointment')}
                      />
                      <label
                        htmlFor={`appt-${status.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {status.name} <span className="text-muted-foreground text-xs">({status.pipelineName})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Status de Comparecimento */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>✅ Status de Comparecimento</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {config.attendanceStatusIds.length} selecionado{config.attendanceStatusIds.length !== 1 ? 's' : ''}
                  </Badge>
                  {config.attendanceStatusIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setConfig({ ...config, attendanceStatusIds: [] })}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Status que indicam que o cliente compareceu à consulta
              </p>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-2">
                  {allStatuses.map(status => (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`att-${status.id}`}
                        checked={config.attendanceStatusIds.includes(status.id)}
                        onCheckedChange={() => toggleStatus(status.id, 'attendance')}
                      />
                      <label
                        htmlFor={`att-${status.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {status.name} <span className="text-muted-foreground text-xs">({status.pipelineName})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Status de Fechamento */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>💰 Status de Fechamento (Venda Ganha)</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {config.closedWonStatusIds.length} selecionado{config.closedWonStatusIds.length !== 1 ? 's' : ''}
                  </Badge>
                  {config.closedWonStatusIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setConfig({ ...config, closedWonStatusIds: [] })}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Status que indicam que a venda foi fechada com sucesso
              </p>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-2">
                  {allStatuses.map(status => (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`closed-${status.id}`}
                        checked={config.closedWonStatusIds.includes(status.id)}
                        onCheckedChange={() => toggleStatus(status.id, 'closed')}
                      />
                      <label
                        htmlFor={`closed-${status.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {status.name} <span className="text-muted-foreground text-xs">({status.pipelineName})</span>
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
          <Button onClick={handleSave}>
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
