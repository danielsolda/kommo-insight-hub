import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings } from "lucide-react";

export interface BusinessHoursConfig {
  startHour: number;
  endHour: number;
  days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  slaMinutes: number;
}

const DEFAULT_CONFIG: BusinessHoursConfig = {
  startHour: 8,
  endHour: 18,
  days: [1, 2, 3, 4, 5], // Mon-Fri
  slaMinutes: 10,
};

const DAY_LABELS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export const loadBusinessHoursConfig = (): BusinessHoursConfig => {
  try {
    const saved = localStorage.getItem("businessHoursConfig");
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_CONFIG;
};

const saveBusinessHoursConfig = (config: BusinessHoursConfig) => {
  localStorage.setItem("businessHoursConfig", JSON.stringify(config));
};

interface BusinessHoursConfigModalProps {
  onConfigChanged?: () => void;
}

export const BusinessHoursConfigModal = ({ onConfigChanged }: BusinessHoursConfigModalProps) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<BusinessHoursConfig>(loadBusinessHoursConfig);

  const toggleDay = (day: number) => {
    setConfig(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort()
    }));
  };

  const handleSave = () => {
    saveBusinessHoursConfig(config);
    setOpen(false);
    onConfigChanged?.();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Settings className="h-4 w-4" />
        Configurar Período
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Período de Atendimento</DialogTitle>
            <DialogDescription>
              Configure os dias e horários de atendimento. O SLA só será contabilizado dentro desse período.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Days */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dias de atendimento</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                      config.days.includes(value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-border hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      checked={config.days.includes(value)}
                      onCheckedChange={() => toggleDay(value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startHour">Início (hora)</Label>
                <Input
                  id="startHour"
                  type="number"
                  min={0}
                  max={23}
                  value={config.startHour}
                  onChange={e => setConfig(prev => ({ ...prev, startHour: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endHour">Fim (hora)</Label>
                <Input
                  id="endHour"
                  type="number"
                  min={1}
                  max={24}
                  value={config.endHour}
                  onChange={e => setConfig(prev => ({ ...prev, endHour: parseInt(e.target.value) || 18 }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Horário: {config.startHour}:00 às {config.endHour}:00 (fuso America/São Paulo)
            </p>

            {/* SLA */}
            <div className="space-y-2">
              <Label htmlFor="slaMinutes">SLA (minutos)</Label>
              <Input
                id="slaMinutes"
                type="number"
                min={1}
                max={1440}
                value={config.slaMinutes}
                onChange={e => setConfig(prev => ({ ...prev, slaMinutes: parseInt(e.target.value) || 10 }))}
              />
              <p className="text-xs text-muted-foreground">
                Tempo máximo aceitável para resposta dentro do período de atendimento
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};