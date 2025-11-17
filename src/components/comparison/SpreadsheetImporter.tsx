import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileSpreadsheet } from "lucide-react";
import { ParsedSpreadsheet } from "@/utils/spreadsheetParser";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SpreadsheetImporterProps {
  spreadsheets: ParsedSpreadsheet[];
  isLoading: boolean;
  onFilesSelected: (files: File[]) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export const SpreadsheetImporter = ({
  spreadsheets,
  isLoading,
  onFilesSelected,
  onRemove,
  onClearAll,
}: SpreadsheetImporterProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Importar Planilhas do CRM</CardTitle>
            <CardDescription>
              Faça upload de múltiplas exportações para análise comparativa
            </CardDescription>
          </div>
          {spreadsheets.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Limpar Todas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUpload onFilesSelected={onFilesSelected} maxFiles={5} />

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">
            Processando planilhas...
          </div>
        )}

        {spreadsheets.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Planilhas Importadas:</h4>
            <div className="grid gap-2">
              {spreadsheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sheet.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {sheet.rowCount} registros
                        </Badge>
                        {sheet.dateRange && (
                          <Badge variant="outline" className="text-xs">
                            {format(sheet.dateRange.start, "dd/MM", { locale: ptBR })} -{" "}
                            {format(sheet.dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(sheet.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
