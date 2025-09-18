import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, DollarSign, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface InvestmentConfig {
  monthlyInvestment: number;
  roiGoal: number;
}

interface InvestmentSettingsModalProps {
  config: InvestmentConfig;
  onConfigChange: (config: InvestmentConfig) => void;
}

export const InvestmentSettingsModal = ({ config, onConfigChange }: InvestmentSettingsModalProps) => {
  const [open, setOpen] = useState(false);
  const [monthlyInvestment, setMonthlyInvestment] = useState(config.monthlyInvestment.toString());
  const [roiGoal, setRoiGoal] = useState(config.roiGoal.toString());
  const { toast } = useToast();

  useEffect(() => {
    setMonthlyInvestment(config.monthlyInvestment.toString());
    setRoiGoal(config.roiGoal.toString());
  }, [config]);

  const handleSave = () => {
    const investment = Number(monthlyInvestment) || 0;
    const goal = Number(roiGoal) || 0;

    if (investment < 0 || goal < 0) {
      toast({
        title: "Valores inválidos",
        description: "Os valores devem ser positivos.",
        variant: "destructive",
      });
      return;
    }

    const newConfig: InvestmentConfig = {
      monthlyInvestment: investment,
      roiGoal: goal,
    };

    onConfigChange(newConfig);
    setOpen(false);
    
    toast({
      title: "Configurações salvas!",
      description: "As configurações de investimento foram atualizadas.",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Investimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações de Investimento</DialogTitle>
          <DialogDescription>
            Configure seu investimento mensal e meta de ROI para calcular o retorno real.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                Investimento Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-semibold">
                {formatCurrency(config.monthlyInvestment)}
              </div>
              <div className="text-xs text-muted-foreground">por mês</div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="investment">Investimento Mensal (R$)</Label>
              <Input
                id="investment"
                type="number"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(e.target.value)}
                placeholder="10000"
                min="0"
                step="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roiGoal">Meta de ROI (%)</Label>
              <Input
                id="roiGoal"
                type="number"
                value={roiGoal}
                onChange={(e) => setRoiGoal(e.target.value)}
                placeholder="300"
                min="0"
                step="10"
              />
            </div>
          </div>

          <Card className="bg-muted/30 border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-info" />
                Fórmula do ROI
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">
                ROI = (Receita - Investimento) ÷ Investimento × 100
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};