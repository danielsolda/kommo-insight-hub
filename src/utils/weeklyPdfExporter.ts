import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, CustomField } from '@/services/kommoApi';
import type { WeeklyMetricsConfig } from '@/components/WeeklyMetricsConfig';

export interface WeeklyPdfExportOptions {
  leads: Lead[];
  config: WeeklyMetricsConfig;
  numberOfWeeks?: number;
  chartRef?: HTMLElement | null;
}

interface WeeklyData {
  total: number;
  traffic: number;
  appointments: number;
  attendances: number;
  closures: number;
}

interface WeeklyStats {
  range: { start: Date; end: Date };
  data: WeeklyData;
}

const getWeekRange = (weeksAgo: number = 0): { start: Date; end: Date } => {
  const today = new Date();
  const currentWeekStart = startOfWeek(subWeeks(today, weeksAgo), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  return { start: currentWeekStart, end: currentWeekEnd };
};

const isLeadInWeek = (lead: Lead, start: Date, end: Date): boolean => {
  const leadDate = new Date(lead.created_at * 1000);
  return isWithinInterval(leadDate, { start, end });
};

const hasCustomFieldValue = (lead: Lead, fieldId: number, targetValues: string[]): boolean => {
  if (!lead.custom_fields_values || !fieldId || targetValues.length === 0) return false;
  
  const field = lead.custom_fields_values.find((f: CustomField) => f.field_id === fieldId);
  if (!field || !field.values || field.values.length === 0) return false;
  
  const fieldValue = field.values[0]?.value;
  if (!fieldValue) return false;
  
  return targetValues.some(val => 
    fieldValue.toString().toLowerCase().includes(val.toLowerCase())
  );
};

const hasStatus = (lead: Lead, statusIds: number[]): boolean => {
  return statusIds.includes(lead.status_id);
};

const calculateWeekData = (
  leads: Lead[],
  config: WeeklyMetricsConfig,
  start: Date,
  end: Date
): WeeklyData => {
  const weekLeads = leads.filter(lead => isLeadInWeek(lead, start, end));
  
  const total = weekLeads.length;
  
  const traffic = config.trafficField.fieldId
    ? weekLeads.filter(lead => 
        hasCustomFieldValue(lead, config.trafficField.fieldId!, config.trafficField.values)
      ).length
    : 0;
  
  const appointments = weekLeads.filter(lead => 
    hasStatus(lead, config.appointmentStatusIds)
  ).length;
  
  const attendances = weekLeads.filter(lead => 
    hasStatus(lead, config.attendanceStatusIds)
  ).length;
  
  const closures = weekLeads.filter(lead => 
    hasStatus(lead, config.closedWonStatusIds)
  ).length;
  
  return { total, traffic, appointments, attendances, closures };
};

const calculateMultipleWeeks = (
  leads: Lead[],
  config: WeeklyMetricsConfig,
  numberOfWeeks: number
): WeeklyStats[] => {
  const results: WeeklyStats[] = [];
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const range = getWeekRange(i);
    const data = calculateWeekData(leads, config, range.start, range.end);
    results.push({ range, data });
  }
  
  return results.reverse(); // Ordem cronológica (mais antiga primeiro)
};

const calculateConversionRates = (data: WeeklyData): {
  trafficToAppointment: string;
  appointmentToAttendance: string;
  attendanceToClosures: string;
  totalConversion: string;
} => {
  const trafficToAppointment = data.traffic > 0
    ? ((data.appointments / data.traffic) * 100).toFixed(1) + '%'
    : 'N/A';
  
  const appointmentToAttendance = data.appointments > 0
    ? ((data.attendances / data.appointments) * 100).toFixed(1) + '%'
    : 'N/A';
  
  const attendanceToClosures = data.attendances > 0
    ? ((data.closures / data.attendances) * 100).toFixed(1) + '%'
    : 'N/A';
  
  const totalConversion = data.traffic > 0
    ? ((data.closures / data.traffic) * 100).toFixed(1) + '%'
    : 'N/A';
  
  return {
    trafficToAppointment,
    appointmentToAttendance,
    attendanceToClosures,
    totalConversion,
  };
};

const generateInsights = (weeklyStats: WeeklyStats[], config: WeeklyMetricsConfig): string[] => {
  const insights: string[] = [];
  
  if (weeklyStats.length < 2) return insights;
  
  const currentWeek = weeklyStats[weeklyStats.length - 1];
  const previousWeek = weeklyStats[weeklyStats.length - 2];
  
  // Crescimento ou queda em leads totais
  const totalChange = currentWeek.data.total - previousWeek.data.total;
  const totalChangePercent = previousWeek.data.total > 0
    ? ((totalChange / previousWeek.data.total) * 100).toFixed(1)
    : '0';
  
  if (totalChange > 0) {
    insights.push(`Crescimento de ${totalChangePercent}% em leads totais vs semana anterior (${previousWeek.data.total} -> ${currentWeek.data.total})`);
  } else if (totalChange < 0) {
    insights.push(`Queda de ${Math.abs(parseFloat(totalChangePercent))}% em leads totais vs semana anterior (${previousWeek.data.total} -> ${currentWeek.data.total})`);
  }
  
  // Taxa de comparecimento
  const attendanceRate = currentWeek.data.appointments > 0
    ? ((currentWeek.data.attendances / currentWeek.data.appointments) * 100).toFixed(1)
    : '0';
  
  if (parseFloat(attendanceRate) > 60) {
    insights.push(`Taxa de comparecimento acima da média (${attendanceRate}%)`);
  } else if (parseFloat(attendanceRate) < 40 && currentWeek.data.appointments > 0) {
    insights.push(`Taxa de comparecimento abaixo da média (${attendanceRate}%) - requer atenção`);
  }
  
  // Taxa de conversão total
  const conversionRate = currentWeek.data.traffic > 0
    ? ((currentWeek.data.closures / currentWeek.data.traffic) * 100).toFixed(1)
    : '0';
  
  if (parseFloat(conversionRate) > 20) {
    insights.push(`Excelente taxa de conversão total (${conversionRate}%)`);
  } else if (parseFloat(conversionRate) < 10 && currentWeek.data.traffic > 0) {
    insights.push(`Taxa de conversão abaixo do esperado (${conversionRate}%) - avaliar funil`);
  }
  
  // Tendência ao longo das semanas
  if (weeklyStats.length >= 3) {
    const recentWeeks = weeklyStats.slice(-3);
    const isGrowing = recentWeeks.every((week, idx) => 
      idx === 0 || week.data.total >= recentWeeks[idx - 1].data.total
    );
    const isDeclining = recentWeeks.every((week, idx) => 
      idx === 0 || week.data.total <= recentWeeks[idx - 1].data.total
    );
    
    if (isGrowing) {
      insights.push('Tendência de crescimento consistente nas últimas 3 semanas');
    } else if (isDeclining) {
      insights.push('Tendência de queda nas últimas 3 semanas - requer ação');
    }
  }
  
  return insights;
};

export const exportWeeklyMetricsToPDF = async ({
  leads,
  config,
  numberOfWeeks = 4,
  chartRef,
}: WeeklyPdfExportOptions): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Calcular dados para múltiplas semanas
  const weeklyStats = calculateMultipleWeeks(leads, config, numberOfWeeks);
  const currentWeek = weeklyStats[weeklyStats.length - 1];
  const previousWeek = weeklyStats.length > 1 ? weeklyStats[weeklyStats.length - 2] : null;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMO SEMANAL DE LEADS', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Período e data de geração
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const periodText = `Período: ${format(currentWeek.range.start, 'dd/MM/yyyy', { locale: ptBR })} - ${format(currentWeek.range.end, 'dd/MM/yyyy', { locale: ptBR })}`;
  pdf.text(periodText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  const generatedText = `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`;
  pdf.text(generatedText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // SEÇÃO 1: Métricas da Semana Atual
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('METRICAS DA SEMANA ATUAL', margin, yPosition);
  yPosition += 8;

  const metricsData = [
    [
      'Total de Leads',
      currentWeek.data.total.toString(),
      previousWeek ? previousWeek.data.total.toString() : '-',
      previousWeek && previousWeek.data.total > 0
        ? `${((currentWeek.data.total - previousWeek.data.total) / previousWeek.data.total * 100).toFixed(1)}%`
        : '-',
    ],
    [
      'Leads de Tráfego',
      currentWeek.data.traffic.toString(),
      previousWeek ? previousWeek.data.traffic.toString() : '-',
      previousWeek && previousWeek.data.traffic > 0
        ? `${((currentWeek.data.traffic - previousWeek.data.traffic) / previousWeek.data.traffic * 100).toFixed(1)}%`
        : '-',
    ],
    [
      'Agendamentos',
      currentWeek.data.appointments.toString(),
      previousWeek ? previousWeek.data.appointments.toString() : '-',
      previousWeek && previousWeek.data.appointments > 0
        ? `${((currentWeek.data.appointments - previousWeek.data.appointments) / previousWeek.data.appointments * 100).toFixed(1)}%`
        : '-',
    ],
    [
      'Comparecimentos',
      currentWeek.data.attendances.toString(),
      previousWeek ? previousWeek.data.attendances.toString() : '-',
      previousWeek && previousWeek.data.attendances > 0
        ? `${((currentWeek.data.attendances - previousWeek.data.attendances) / previousWeek.data.attendances * 100).toFixed(1)}%`
        : '-',
    ],
    [
      'Fechamentos',
      currentWeek.data.closures.toString(),
      previousWeek ? previousWeek.data.closures.toString() : '-',
      previousWeek && previousWeek.data.closures > 0
        ? `${((currentWeek.data.closures - previousWeek.data.closures) / previousWeek.data.closures * 100).toFixed(1)}%`
        : '-',
    ],
  ];

  autoTable(pdf, {
    startY: yPosition,
    head: [['Métrica', 'Valor', 'Semana Ant.', 'Variação']],
    body: metricsData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 12;

  // SEÇÃO 2: Gráfico de Tendência
  if (chartRef) {
    try {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GRAFICO DE TENDENCIA', margin, yPosition);
      yPosition += 8;

      const canvas = await html2canvas(chartRef, {
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
      yPosition += imgHeight + 12;
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
  }

  // SEÇÃO 3: Histórico Detalhado
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HISTORICO DETALHADO', margin, yPosition);
  yPosition += 8;

  const historyData = weeklyStats.map(week => [
    `${format(week.range.start, 'dd/MM', { locale: ptBR })} - ${format(week.range.end, 'dd/MM', { locale: ptBR })}`,
    week.data.total.toString(),
    week.data.traffic.toString(),
    week.data.appointments.toString(),
    week.data.attendances.toString(),
    week.data.closures.toString(),
  ]);

  autoTable(pdf, {
    startY: yPosition,
    head: [['Semana', 'Total', 'Tráfego', 'Agend.', 'Compar.', 'Fech.']],
    body: historyData,
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

  yPosition = (pdf as any).lastAutoTable.finalY + 12;

  // SEÇÃO 4: Funil de Conversão
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FUNIL DE CONVERSAO (semana atual)', margin, yPosition);
  yPosition += 8;

  const conversions = calculateConversionRates(currentWeek.data);
  const funnelData = [
    ['Trafego -> Agendamento', `${conversions.trafficToAppointment} (${currentWeek.data.traffic} -> ${currentWeek.data.appointments})`],
    ['Agendamento -> Comparecimento', `${conversions.appointmentToAttendance} (${currentWeek.data.appointments} -> ${currentWeek.data.attendances})`],
    ['Comparecimento -> Fechamento', `${conversions.attendanceToClosures} (${currentWeek.data.attendances} -> ${currentWeek.data.closures})`],
    ['Conversao Total', `${conversions.totalConversion} (${currentWeek.data.traffic} -> ${currentWeek.data.closures})`],
  ];

  autoTable(pdf, {
    startY: yPosition,
    head: [['Etapa', 'Taxa de Conversão']],
    body: funnelData,
    theme: 'plain',
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 12;

  // SEÇÃO 5: Insights Automáticos
  const insights = generateInsights(weeklyStats, config);
  
  if (insights.length > 0) {
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INSIGHTS AUTOMATICOS', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    for (const insight of insights) {
      // Replace special characters that jsPDF can't render
      const cleanInsight = insight
        .replace(/→/g, '->')
        .replace(/←/g, '<-')
        .replace(/•/g, '-');
      
      const textLine = `- ${cleanInsight}`;
      
      if (yPosition + 8 > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(textLine, margin, yPosition, { maxWidth: pageWidth - 2 * margin });
      yPosition += 8;
    }
  }

  // Save the PDF
  const fileName = `resumo-semanal-leads-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  pdf.save(fileName);
};
