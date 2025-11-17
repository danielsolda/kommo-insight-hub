import { useState } from "react";
import { useSpreadsheetParser } from "@/hooks/useSpreadsheetParser";
import { SpreadsheetImporter } from "./SpreadsheetImporter";
import { SpreadsheetComparison } from "./SpreadsheetComparison";
import { CustomFieldsComparison } from "./CustomFieldsComparison";
import { ComparisonInsights } from "./ComparisonInsights";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export const ComparisonDashboard = () => {
  const { spreadsheets, isLoading, parseFiles, removeSpreadsheet, clearAll } = useSpreadsheetParser();
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>("");

  const spreadsheetA = spreadsheets.find((s) => s.id === selectedA) || null;
  const spreadsheetB = spreadsheets.find((s) => s.id === selectedB) || null;

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
          <SpreadsheetComparison spreadsheets={spreadsheets} />

          {spreadsheetA && spreadsheetB && (
            <>
              <CustomFieldsComparison spreadsheetA={spreadsheetA} spreadsheetB={spreadsheetB} />
              <ComparisonInsights spreadsheetA={spreadsheetA} spreadsheetB={spreadsheetB} />
            </>
          )}
        </>
      )}
    </div>
  );
};
