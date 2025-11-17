import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  id: string;
  name: string;
  uploadedAt: Date;
  rowCount: number;
  dateRange: { start: Date; end: Date } | null;
  data: Record<string, any>[];
  columns: string[];
}

export const parseExcelFile = async (file: File): Promise<ParsedSpreadsheet> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          reject(new Error('Planilha vazia'));
          return;
        }
        
        const columns = Object.keys(jsonData[0] as Record<string, any>);
        const dateRange = extractDateRange(jsonData);
        
        resolve({
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          uploadedAt: new Date(),
          rowCount: jsonData.length,
          dateRange,
          data: jsonData as Record<string, any>[],
          columns,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsBinaryString(file);
  });
};

const extractDateRange = (data: any[]): { start: Date; end: Date } | null => {
  const dateFields = ['Data de criação', 'Created at', 'Data', 'Date'];
  
  for (const field of dateFields) {
    const dates = data
      .map(row => {
        const value = row[field];
        if (!value) return null;
        
        // Try to parse different date formats
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date;
        
        return null;
      })
      .filter(Boolean) as Date[];
    
    if (dates.length > 0) {
      return {
        start: new Date(Math.min(...dates.map(d => d.getTime()))),
        end: new Date(Math.max(...dates.map(d => d.getTime()))),
      };
    }
  }
  
  return null;
};

export const detectCustomFields = (spreadsheets: ParsedSpreadsheet[]): string[] => {
  const allColumns = new Set<string>();
  
  spreadsheets.forEach(sheet => {
    sheet.columns.forEach(col => allColumns.add(col));
  });
  
  // Filter out standard fields
  const standardFields = [
    'ID', 'Nome', 'Name', 'Email', 'Telefone', 'Phone',
    'Responsável', 'Responsible', 'Pipeline', 'Etapa', 'Stage',
    'Data de criação', 'Created at', 'Valor', 'Value', 'Status'
  ];
  
  return Array.from(allColumns).filter(
    col => !standardFields.some(std => col.toLowerCase().includes(std.toLowerCase()))
  );
};

export const getFieldValues = (
  spreadsheet: ParsedSpreadsheet,
  fieldName: string
): any[] => {
  return spreadsheet.data
    .map(row => row[fieldName])
    .filter(value => value !== null && value !== undefined && value !== '');
};

export const detectFieldType = (values: any[]): 'categorical' | 'numeric' | 'date' | 'boolean' => {
  if (values.length === 0) return 'categorical';
  
  const sample = values.slice(0, 100);
  
  // Check if boolean
  const uniqueValues = new Set(sample.map(v => String(v).toLowerCase()));
  if (uniqueValues.size <= 3 && 
      Array.from(uniqueValues).every(v => ['sim', 'não', 'yes', 'no', 'true', 'false', ''].includes(v))) {
    return 'boolean';
  }
  
  // Check if numeric
  const numericCount = sample.filter(v => !isNaN(Number(v))).length;
  if (numericCount / sample.length > 0.8) {
    return 'numeric';
  }
  
  // Check if date
  const dateCount = sample.filter(v => {
    const date = new Date(v);
    return !isNaN(date.getTime());
  }).length;
  if (dateCount / sample.length > 0.8) {
    return 'date';
  }
  
  return 'categorical';
};
