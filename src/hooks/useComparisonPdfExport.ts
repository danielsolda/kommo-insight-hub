import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { ParsedSpreadsheet } from '@/utils/spreadsheetParser';
import { exportComparisonToPDF } from '@/utils/pdfExporter';

interface UseComparisonPdfExportOptions {
  spreadsheetA: ParsedSpreadsheet | null;
  spreadsheetB: ParsedSpreadsheet | null;
  selectedFields: string[];
  chartRefs: Map<string, HTMLElement | null>;
  insights: string[];
  getFieldComparison: (fieldName: string) => { distA: Record<string, number>; distB: Record<string, number> } | null;
}

export const useComparisonPdfExport = ({
  spreadsheetA,
  spreadsheetB,
  selectedFields,
  chartRefs,
  insights,
  getFieldComparison,
}: UseComparisonPdfExportOptions) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    // Validation
    if (!spreadsheetA || !spreadsheetB) {
      toast({
        variant: 'destructive',
        title: 'Erro na exportação',
        description: 'Selecione duas planilhas para comparar',
      });
      return;
    }

    if (selectedFields.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum campo selecionado',
        description: 'Selecione pelo menos um campo para exportar',
      });
      return;
    }

    setIsExporting(true);

    try {
      await exportComparisonToPDF({
        spreadsheetA,
        spreadsheetB,
        selectedFields,
        chartRefs,
        insights,
        getFieldComparison,
      });

      toast({
        title: 'PDF exportado com sucesso',
        description: `Relatório com ${selectedFields.length} métrica${selectedFields.length > 1 ? 's' : ''} gerado`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    handleExport,
  };
};
