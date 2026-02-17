import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardModeSelectorProps {
  open: boolean;
  onSelect: (mode: "clinica" | "vendas") => void;
}

export const DashboardModeSelector = ({ open, onSelect }: DashboardModeSelectorProps) => {
  const [selected, setSelected] = useState<"clinica" | "vendas" | null>(null);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Escolha o modo do Dashboard</DialogTitle>
          <DialogDescription className="text-center">
            Selecione o tipo de dashboard que melhor se adequa ao seu negócio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-6">
          <Card
            className={cn(
              "cursor-pointer transition-all hover:scale-[1.02] border-2",
              selected === "clinica" ? "border-primary shadow-elegant" : "border-border/50"
            )}
            onClick={() => setSelected("clinica")}
          >
            <CardContent className="flex flex-col items-center gap-3 pt-6 pb-4">
              <div className={cn(
                "p-4 rounded-xl",
                selected === "clinica" ? "bg-gradient-primary" : "bg-muted"
              )}>
                <Stethoscope className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Clínica</h3>
              <p className="text-sm text-muted-foreground text-center">
                Consultas, procedimentos, taxa de conversão por médico
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-all hover:scale-[1.02] border-2",
              selected === "vendas" ? "border-primary shadow-elegant" : "border-border/50"
            )}
            onClick={() => setSelected("vendas")}
          >
            <CardContent className="flex flex-col items-center gap-3 pt-6 pb-4">
              <div className={cn(
                "p-4 rounded-xl",
                selected === "vendas" ? "bg-gradient-primary" : "bg-muted"
              )}>
                <TrendingUp className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Vendas</h3>
              <p className="text-sm text-muted-foreground text-center">
                Pipeline, receita, ranking de vendedores, metas
              </p>
            </CardContent>
          </Card>
        </div>

        <Button
          className="w-full"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          Confirmar
        </Button>
      </DialogContent>
    </Dialog>
  );
};
