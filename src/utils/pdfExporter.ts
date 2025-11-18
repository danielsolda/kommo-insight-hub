import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ParsedSpreadsheet } from './spreadsheetParser';
import { format, parse, startOfDay, startOfHour, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportOptions {
  spreadsheetA: ParsedSpreadsheet;
  spreadsheetB: ParsedSpreadsheet;
  selectedFields: string[];
  chartRefs: Map<string, HTMLElement | null>;
  insights: string[];
  getFieldComparison: (fieldName: string) => { distA: Record<string, number>; distB: Record<string, number> } | null;
}

// Detectar se um campo contém dados de data
const isDateField = (fieldName: string, values: string[]): boolean => {
  const dateKeywords = ['data', 'date', 'criada', 'created', 'criado', 'at', 'em'];
  const hasDateKeyword = dateKeywords.some(kw =>
    fieldName.toLowerCase().includes(kw)
  );

  // Amostragem robusta, ignorando vazios
  const sample = values.filter(v => v && v !== '(vazio)').slice(0, 30);
  if (sample.length === 0) return false;

  const dateCount = sample.filter(v => {
    const d = parsePossibleDate(v);
    return !!d;
  }).length;
  const ratio = dateCount / sample.length;

  // Se o nome sugere data, use limiar mais permissivo; caso contrário, exija alta confiança
  if (hasDateKeyword) return ratio > 0.4;
  return ratio > 0.8;
};

// Utilitário robusto para parsear datas em múltiplos formatos
const parsePossibleDate = (value: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const formats = [
    "dd.MM.yyyy HH:mm:ss",
    "dd.MM.yyyy HH:mm",
    "dd.MM.yyyy",
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy HH:mm",
    "dd/MM/yyyy",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm:ssXXX",
    "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
  ];

  for (const fmt of formats) {
    try {
      const d = parse(trimmed, fmt, new Date());
      if (!isNaN(d.getTime()) && d.getFullYear() > 1900) return d;
    } catch (_) {}
  }

  // Fallback nativo
  const native = new Date(trimmed);
  if (!isNaN(native.getTime()) && native.getFullYear() > 1900) return native;
  return null;
};

// Determinar granularidade ideal baseada no período
const determineGranularity = (dates: Date[]): 'hour' | 'day' | 'month' => {
  const validDates = dates.filter(d => !isNaN(d.getTime()));
  if (validDates.length === 0) return 'day';
  
  const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));
  const daysDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 3) return 'hour';
  if (daysDiff < 60) return 'day';
  return 'month';
};

// Formatar data conforme granularidade
const formatDateByGranularity = (date: Date, granularity: 'hour' | 'day' | 'month'): string => {
  switch (granularity) {
    case 'hour':
      return format(date, "dd/MM/yyyy HH'h'", { locale: ptBR });
    case 'day':
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    case 'month':
      return format(date, 'MMM/yyyy', { locale: ptBR });
  }
};

// Agregar dados de data
const aggregateDateData = (
  distA: Record<string, number>,
  distB: Record<string, number>,
  granularity: 'hour' | 'day' | 'month'
): Array<[string, number, number, string]> => {
  const aggregated = new Map<string, { a: number; b: number }>();
  
  // Agregar distribuição A
  Object.entries(distA).forEach(([dateStr, count]) => {
    const date = parsePossibleDate(dateStr);
    if (!date) return;
    
    let key: Date;
    if (granularity === 'hour') {
      key = startOfHour(date);
    } else if (granularity === 'day') {
      key = startOfDay(date);
    } else {
      key = startOfMonth(date);
    }
    
    const keyStr = formatDateByGranularity(key, granularity);
    const existing = aggregated.get(keyStr) || { a: 0, b: 0 };
    aggregated.set(keyStr, { ...existing, a: existing.a + count });
  });
  
  // Agregar distribuição B
  Object.entries(distB).forEach(([dateStr, count]) => {
    const date = parsePossibleDate(dateStr);
    if (!date) return;
    
    let key: Date;
    if (granularity === 'hour') {
      key = startOfHour(date);
    } else if (granularity === 'day') {
      key = startOfDay(date);
    } else {
      key = startOfMonth(date);
    }
    
    const keyStr = formatDateByGranularity(key, granularity);
    const existing = aggregated.get(keyStr) || { a: 0, b: 0 };
    aggregated.set(keyStr, { ...existing, b: existing.b + count });
  });
  
  // Converter para array e calcular variação
  const result = Array.from(aggregated.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, counts]): [string, number, number, string] => {
      const variation = counts.a > 0 
        ? ((counts.b - counts.a) / counts.a * 100).toFixed(1) + '%'
        : counts.b > 0 ? '+∞' : '-';
      return [period, counts.a, counts.b, variation];
    });
  
  // Limitar a 10 linhas mais relevantes
  if (result.length > 10) {
    return result.slice(0, 10);
  }
  
  return result;
};

export const exportComparisonToPDF = async ({
  spreadsheetA,
  spreadsheetB,
  selectedFields,
  chartRefs,
  insights,
  getFieldComparison,
}: ExportOptions): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Relatório Comparativo de Leads', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Spreadsheet info
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Planilha A: ${spreadsheetA.name}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Planilha B: ${spreadsheetB.name}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Data de geração: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPosition);
  yPosition += 10;

  // For each selected field
  for (const field of selectedFields) {
    // Check if we need a new page
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    }

    // Field title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Métrica: ${field}`, margin, yPosition);
    yPosition += 8;

    // Get field comparison data
    const comparison = getFieldComparison(field);
    
    if (comparison) {
      const { distA, distB } = comparison;
      const allCategories = Array.from(new Set([...Object.keys(distA), ...Object.keys(distB)]));

      // Verificar se é campo de data
      const isDate = isDateField(field, allCategories);

      if (isDate) {
        // Processar como campo de data - mostrar resumo agregado
        const allDates = allCategories
          .filter(cat => cat && cat !== '(vazio)')
          .map(cat => parsePossibleDate(cat))
          .filter((d): d is Date => !!d);

        const granularity = determineGranularity(allDates);
        const aggregatedData = aggregateDateData(distA, distB, granularity);

        // Calcular totais
        const totalA = Object.values(distA).reduce((sum, val) => sum + val, 0);
        const totalB = Object.values(distB).reduce((sum, val) => sum + val, 0);

        // Adicionar resumo temporal
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`RESUMO TEMPORAL (${granularity === 'hour' ? 'por hora' : granularity === 'day' ? 'por dia' : 'por mês'})`, margin, yPosition);
        yPosition += 5;
        pdf.text(`Total A: ${totalA} leads | Total B: ${totalB} leads`, margin, yPosition);
        yPosition += 8;

        // Add aggregated table
        autoTable(pdf, {
          startY: yPosition,
          head: [['Período', 'Qtd A', 'Qtd B', 'Variação']],
          body: aggregatedData,
          theme: 'striped',
          headStyles: {
            fillColor: [243, 244, 246],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 9,
            cellPadding: 3,
          },
          margin: { left: margin, right: margin },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 8;
      } else {
        // Processar como campo categórico normal
        const tableData = allCategories.map(category => [
          category || '(vazio)',
          distA[category] || 0,
          distB[category] || 0,
        ]);

        // Add table
        autoTable(pdf, {
          startY: yPosition,
          head: [['Categoria', 'Qtd A', 'Qtd B']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [243, 244, 246],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 9,
            cellPadding: 3,
          },
          margin: { left: margin, right: margin },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 8;
      }

      // Capture and add chart
      const chartElement = chartRefs.get(field);
      if (chartElement) {
        try {
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Check if image fits on current page
          if (yPosition + imgHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (error) {
          console.error('Error capturing chart:', error);
          // Continue without the chart
        }
      }
    }
  }

  // Add insights page if there are insights
  if (insights.length > 0) {
    pdf.addPage();
    yPosition = margin;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Insights Automáticos', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    for (const insight of insights) {
      // Split long text into multiple lines
      const lines = pdf.splitTextToSize(insight, pageWidth - 2 * margin);
      
      // Check if we need a new page
      if (yPosition + lines.length * 6 > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(`• ${lines[0]}`, margin, yPosition);
      yPosition += 6;

      // Add remaining lines with indent
      for (let i = 1; i < lines.length; i++) {
        pdf.text(lines[i], margin + 5, yPosition);
        yPosition += 6;
      }

      yPosition += 2; // Extra space between insights
    }
  }

  // Save the PDF
  const fileName = `relatorio-comparativo-leads-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};
