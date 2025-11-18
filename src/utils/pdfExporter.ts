import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ParsedSpreadsheet } from './spreadsheetParser';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportOptions {
  spreadsheetA: ParsedSpreadsheet;
  spreadsheetB: ParsedSpreadsheet;
  selectedFields: string[];
  chartRefs: Map<string, HTMLElement | null>;
  insights: string[];
  getFieldComparison: (fieldName: string) => { distA: Record<string, number>; distB: Record<string, number> } | null;
}

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
  pdf.text(`Planilha A: ${spreadsheetA.fileName}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Planilha B: ${spreadsheetB.fileName}`, margin, yPosition);
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

      // Create table data
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
