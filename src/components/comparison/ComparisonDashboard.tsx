import { useState, useRef } from "react";
import { useSpreadsheetParser } from "@/hooks/useSpreadsheetParser";
import { useComparisonAnalytics } from "@/hooks/useComparisonAnalytics";
import { useComparisonPdfExport } from "@/hooks/useComparisonPdfExport";
import { SpreadsheetImporter } from "./SpreadsheetImporter";
import { SpreadsheetComparison } from "./SpreadsheetComparison";
import { CustomFieldsComparison, CustomFieldsComparisonRef } from "./CustomFieldsComparison";
import { ComparisonInsights } from "./ComparisonInsights";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoIcon, FileDown, Loader2 } from "lucide-react";

export const ComparisonDashboard = () => {
  const { spreadsheets, isLoading, parseFiles, removeSpreadsheet, clearAll } = useSpreadsheetParser();
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>("");
  const customFieldsRef = useRef<CustomFieldsComparisonRef>(null);

  const spreadsheetA = spreadsheets.find((s) => s.id === selectedA) || null;
  const spreadsheetB = spreadsheets.find((s) => s.id === selectedB) || null;

  const { insights, getFieldComparison } = useComparisonAnalytics(spreadsheetA, spreadsheetB);

  const { isExporting, handleExport } = useComparisonPdfExport({
    spreadsheetA,
    spreadsheetB,
    selectedFields: customFieldsRef.current?.getSelectedFields() || [],
    chartRefs: customFieldsRef.current?.getChartRefs() || new Map(),
    insights,
    getFieldComparison,
  });

  const handleSelectionChange = (idA: string, idB: string) => {
    setSelectedA(idA);
    setSelectedB(idB);
  };

  return (
    <div className="space-y-6 pb-8">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Importe exportações do CRM em formato Excel (.xlsx) ou CSV para comparar períodos diferentes
          e analisar mudanças em campos personalizados, taxas de conversão e comportamento de leads.
        </AlertDescription>
      </Alert>

      <SpreadsheetImporter
        spreadsheets={spreadsheets}
        isLoading={isLoading}
        onFilesSelected={parseFiles}
        onRemove={removeSpreadsheet}
        onClearAll={clearAll}
      />

      {spreadsheets.length >= 2 && (
        <>
          <div className="flex items-center justify-between gap-4">
            <SpreadsheetComparison 
              spreadsheets={spreadsheets} 
              onSelectionChange={handleSelectionChange}
            />
            {spreadsheetA && spreadsheetB && (
              <Button 
                onClick={handleExport}
                disabled={isExporting || !customFieldsRef.current?.getSelectedFields().length}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Exportar PDF
                  </>
                )}
              </Button>
            )}
          </div>

          {spreadsheetA && spreadsheetB && (
            <>
              <CustomFieldsComparison 
                ref={customFieldsRef}
                spreadsheetA={spreadsheetA} 
                spreadsheetB={spreadsheetB} 
              />
              <ComparisonInsights spreadsheetA={spreadsheetA} spreadsheetB={spreadsheetB} />
            </>
          )}
        </>
      )}
    </div>
  );
};
