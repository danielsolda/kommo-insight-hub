import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParsedSpreadsheet } from "@/utils/spreadsheetParser";
import { useComparisonAnalytics } from "@/hooks/useComparisonAnalytics";
import { ArrowUp, ArrowDown, Minus, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface SpreadsheetComparisonProps {
  spreadsheets: ParsedSpreadsheet[];
  onSelectionChange?: (idA: string, idB: string) => void;
}

export const SpreadsheetComparison = ({ spreadsheets, onSelectionChange }: SpreadsheetComparisonProps) => {
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>("");

  const handleSelectA = (value: string) => {
    setSelectedA(value);
    onSelectionChange?.(value, selectedB);
  };

  const handleSelectB = (value: string) => {
    setSelectedB(value);
    onSelectionChange?.(selectedA, value);
  };

  const spreadsheetA = spreadsheets.find((s) => s.id === selectedA) || null;
  const spreadsheetB = spreadsheets.find((s) => s.id === selectedB) || null;

  const { metrics } = useComparisonAnalytics(spreadsheetA, spreadsheetB);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  if (spreadsheets.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Períodos</CardTitle>
          <CardDescription>
            Importe pelo menos 2 planilhas para começar a comparação
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Selecione as Planilhas para Comparar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período A (Base)</label>
              <Select value={selectedA} onValueChange={handleSelectA}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a primeira planilha" />
                </SelectTrigger>
                <SelectContent>
                  {spreadsheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.name}
                      {sheet.dateRange && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({format(sheet.dateRange.start, "dd/MM", { locale: ptBR })} -{" "}
                          {format(sheet.dateRange.end, "dd/MM", { locale: ptBR })})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período B (Comparação)</label>
              <Select value={selectedB} onValueChange={handleSelectB}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a segunda planilha" />
                </SelectTrigger>
                <SelectContent>
                  {spreadsheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id} disabled={sheet.id === selectedA}>
                      {sheet.name}
                      {sheet.dateRange && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({format(sheet.dateRange.start, "dd/MM", { locale: ptBR })} -{" "}
                          {format(sheet.dateRange.end, "dd/MM", { locale: ptBR })})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {metrics && spreadsheetA && spreadsheetB && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total de Leads</CardDescription>
                <CardTitle className="text-3xl">{metrics.totalLeads.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getChangeIcon(metrics.totalLeads.change)}
                  <span className={`text-sm font-medium ${getChangeColor(metrics.totalLeads.change)}`}>
                    {metrics.totalLeads.change > 0 ? "+" : ""}
                    {metrics.totalLeads.change} leads
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {metrics.totalLeads.changePercent > 0 ? "+" : ""}
                    {metrics.totalLeads.changePercent.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Taxa de Conversão</CardDescription>
                <CardTitle className="text-3xl">{metrics.conversionRate.value.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getChangeIcon(metrics.conversionRate.change)}
                  <span className={`text-sm font-medium ${getChangeColor(metrics.conversionRate.change)}`}>
                    {metrics.conversionRate.change > 0 ? "+" : ""}
                    {metrics.conversionRate.change.toFixed(1)}%
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {metrics.conversionRate.changePercent > 0 ? "+" : ""}
                    {metrics.conversionRate.changePercent.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Tempo Médio de Fechamento</CardDescription>
                <CardTitle className="text-3xl">
                  {metrics.avgClosingTime.value > 0
                    ? `${metrics.avgClosingTime.value.toFixed(1)}d`
                    : "N/A"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.avgClosingTime.value > 0 ? (
                  <div className="flex items-center gap-2">
                    {getChangeIcon(metrics.avgClosingTime.change)}
                    <span className={`text-sm font-medium ${getChangeColor(-metrics.avgClosingTime.change)}`}>
                      {metrics.avgClosingTime.change > 0 ? "+" : ""}
                      {metrics.avgClosingTime.change.toFixed(1)} dias
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      {metrics.avgClosingTime.changePercent > 0 ? "+" : ""}
                      {metrics.avgClosingTime.changePercent.toFixed(1)}%
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Dados insuficientes</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => toast.info("Exportação em desenvolvimento - será implementada em breve")}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar Relatório em PDF
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
