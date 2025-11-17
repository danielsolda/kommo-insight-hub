import { useState, useCallback } from 'react';
import { parseExcelFile, ParsedSpreadsheet } from '@/utils/spreadsheetParser';
import { useToast } from '@/hooks/use-toast';

export const useSpreadsheetParser = () => {
  const [spreadsheets, setSpreadsheets] = useState<ParsedSpreadsheet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const parseFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    const newSpreadsheets: ParsedSpreadsheet[] = [];

    for (const file of files) {
      try {
        const parsed = await parseExcelFile(file);
        newSpreadsheets.push(parsed);
        
        toast({
          title: "Planilha importada",
          description: `${file.name} - ${parsed.rowCount} registros`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao importar",
          description: `${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        });
      }
    }

    setSpreadsheets(prev => [...prev, ...newSpreadsheets]);
    setIsLoading(false);
  }, [toast]);

  const removeSpreadsheet = useCallback((id: string) => {
    setSpreadsheets(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSpreadsheets([]);
  }, []);

  return {
    spreadsheets,
    isLoading,
    parseFiles,
    removeSpreadsheet,
    clearAll,
  };
};
