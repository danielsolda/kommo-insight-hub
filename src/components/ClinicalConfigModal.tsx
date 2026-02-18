import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Pipeline, CustomField } from "@/services/kommoApi";

interface ClinicalConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: Pipeline[];
  customFields: CustomField[];
  credentialId: string;
  onSave?: () => void;
}

interface ClinicalConfigData {
  scheduled_pipeline_id: number | null;
  scheduled_status_id: number | null;
  completed_pipeline_id: number | null;
  completed_status_id: number | null;
  rescheduled_pipeline_id: number | null;
  rescheduled_status_id: number | null;
  procedure_pipeline_id: number | null;
  procedure_status_id: number | null;
  doctor_custom_field_id: number | null;
  procedure_custom_field_id: number | null;
}

export const ClinicalConfigModal = ({
  open,
  onOpenChange,
  pipelines,
  customFields,
  credentialId,
  onSave,
}: ClinicalConfigModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ClinicalConfigData>({
    scheduled_pipeline_id: null,
    scheduled_status_id: null,
    completed_pipeline_id: null,
    completed_status_id: null,
    rescheduled_pipeline_id: null,
    rescheduled_status_id: null,
    procedure_pipeline_id: null,
    procedure_status_id: null,
    doctor_custom_field_id: null,
    procedure_custom_field_id: null,
  });

  useEffect(() => {
    if (open && user) {
      loadConfig();
    }
  }, [open, user]);

  const loadConfig = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("clinical_config")
      .select("*")
      .eq("user_id", user.id)
      .eq("credential_id", credentialId)
      .maybeSingle();

    if (data) {
      setConfig({
        scheduled_pipeline_id: data.scheduled_pipeline_id,
        scheduled_status_id: data.scheduled_status_id,
        completed_pipeline_id: data.completed_pipeline_id,
        completed_status_id: data.completed_status_id,
        rescheduled_pipeline_id: data.rescheduled_pipeline_id,
        rescheduled_status_id: data.rescheduled_status_id,
        procedure_pipeline_id: data.procedure_pipeline_id,
        procedure_status_id: data.procedure_status_id,
        doctor_custom_field_id: data.doctor_custom_field_id,
        procedure_custom_field_id: data.procedure_custom_field_id,
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("clinical_config")
        .select("id")
        .eq("user_id", user.id)
        .eq("credential_id", credentialId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("clinical_config")
          .update({ ...config, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("clinical_config")
          .insert({ ...config, user_id: user.id, credential_id: credentialId });
      }

      toast({ title: "Configuração salva!", description: "Mapeamento clínico atualizado." });
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getStatusesForPipeline = (pipelineId: number | null) => {
    if (!pipelineId) return [];
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    return pipeline?.statuses || [];
  };

  // Get unique custom fields from all leads
  const uniqueFields = customFields.reduce((acc, field) => {
    if (!acc.find((f) => f.field_id === field.field_id)) {
      acc.push(field);
    }
    return acc;
  }, [] as CustomField[]);

  const renderStageMapping = (
    label: string,
    pipelineKey: keyof ClinicalConfigData,
    statusKey: keyof ClinicalConfigData
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={config[pipelineKey]?.toString() || ""}
          onValueChange={(v) => setConfig((prev) => ({ ...prev, [pipelineKey]: Number(v), [statusKey]: null }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.filter(p => p.id != null).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={config[statusKey]?.toString() || ""}
          onValueChange={(v) => setConfig((prev) => ({ ...prev, [statusKey]: Number(v) }))}
          disabled={!config[pipelineKey]}
        >
          <SelectTrigger>
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            {getStatusesForPipeline(config[pipelineKey] as number | null).filter(s => s.id != null).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração do Dashboard Clínico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapeamento de Etapas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione o pipeline e a etapa que corresponde a cada tipo de evento clínico.
                Os leads que entrarem nessas etapas serão contabilizados automaticamente.
              </p>
              {renderStageMapping("Consultas Agendadas", "scheduled_pipeline_id", "scheduled_status_id")}
              {renderStageMapping("Consultas Realizadas", "completed_pipeline_id", "completed_status_id")}
              {renderStageMapping("Consultas Remarcadas", "rescheduled_pipeline_id", "rescheduled_status_id")}
              {renderStageMapping("Procedimentos", "procedure_pipeline_id", "procedure_status_id")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campos Personalizados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione os campos personalizados do Kommo que contêm as informações de médico e procedimento.
              </p>
              <div className="space-y-2">
                <Label>Campo de Médico</Label>
                <Select
                  value={config.doctor_custom_field_id?.toString() || ""}
                  onValueChange={(v) => setConfig((prev) => ({ ...prev, doctor_custom_field_id: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o campo de médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueFields.map((f) => (
                      <SelectItem key={f.field_id} value={f.field_id.toString()}>
                        {f.field_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Campo de Procedimento</Label>
                <Select
                  value={config.procedure_custom_field_id?.toString() || ""}
                  onValueChange={(v) => setConfig((prev) => ({ ...prev, procedure_custom_field_id: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o campo de procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueFields.map((f) => (
                      <SelectItem key={f.field_id} value={f.field_id.toString()}>
                        {f.field_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configuração
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
