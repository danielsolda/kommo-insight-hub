import { ParsedSpreadsheet } from './spreadsheetParser';

export interface ComparisonMetrics {
  totalLeads: { value: number; change: number; changePercent: number };
  conversionRate: { value: number; change: number; changePercent: number };
  avgClosingTime: { value: number; change: number; changePercent: number };
}

export const calculateComparisonMetrics = (
  spreadsheetA: ParsedSpreadsheet,
  spreadsheetB: ParsedSpreadsheet
): ComparisonMetrics => {
  const totalLeadsA = spreadsheetA.rowCount;
  const totalLeadsB = spreadsheetB.rowCount;
  const leadsChange = totalLeadsB - totalLeadsA;
  const leadsChangePercent = totalLeadsA > 0 ? (leadsChange / totalLeadsA) * 100 : 0;
  
  // Calculate conversion rates (assuming there's a Status field)
  const conversionA = calculateConversionRate(spreadsheetA);
  const conversionB = calculateConversionRate(spreadsheetB);
  const conversionChange = conversionB - conversionA;
  const conversionChangePercent = conversionA > 0 ? (conversionChange / conversionA) * 100 : 0;
  
  // Calculate average closing time (if available)
  const avgTimeA = calculateAvgClosingTime(spreadsheetA);
  const avgTimeB = calculateAvgClosingTime(spreadsheetB);
  const timeChange = avgTimeB - avgTimeA;
  const timeChangePercent = avgTimeA > 0 ? (timeChange / avgTimeA) * 100 : 0;
  
  return {
    totalLeads: {
      value: totalLeadsB,
      change: leadsChange,
      changePercent: leadsChangePercent,
    },
    conversionRate: {
      value: conversionB,
      change: conversionChange,
      changePercent: conversionChangePercent,
    },
    avgClosingTime: {
      value: avgTimeB,
      change: timeChange,
      changePercent: timeChangePercent,
    },
  };
};

const calculateConversionRate = (spreadsheet: ParsedSpreadsheet): number => {
  const statusFields = ['Status', 'Etapa', 'Stage', 'Pipeline status'];
  
  for (const field of statusFields) {
    if (spreadsheet.columns.includes(field)) {
      const wonStatuses = ['ganho', 'fechado', 'won', 'vendido', 'successfully realized'];
      const wonCount = spreadsheet.data.filter(row => {
        const status = String(row[field]).toLowerCase();
        return wonStatuses.some(ws => status.includes(ws));
      }).length;
      
      return spreadsheet.rowCount > 0 ? (wonCount / spreadsheet.rowCount) * 100 : 0;
    }
  }
  
  return 0;
};

const calculateAvgClosingTime = (spreadsheet: ParsedSpreadsheet): number => {
  const createdFields = ['Data de criação', 'Created at', 'Created'];
  const closedFields = ['Data de fechamento', 'Closed at', 'Data de conclusão'];
  
  let createdField = '';
  let closedField = '';
  
  for (const field of createdFields) {
    if (spreadsheet.columns.includes(field)) {
      createdField = field;
      break;
    }
  }
  
  for (const field of closedFields) {
    if (spreadsheet.columns.includes(field)) {
      closedField = field;
      break;
    }
  }
  
  if (!createdField || !closedField) return 0;
  
  const times = spreadsheet.data
    .map(row => {
      const created = new Date(row[createdField]);
      const closed = new Date(row[closedField]);
      
      if (isNaN(created.getTime()) || isNaN(closed.getTime())) return null;
      
      return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
    })
    .filter(t => t !== null && t > 0) as number[];
  
  if (times.length === 0) return 0;
  
  return times.reduce((a, b) => a + b, 0) / times.length;
};

export const calculateFieldDistribution = (
  spreadsheet: ParsedSpreadsheet,
  fieldName: string
): Record<string, number> => {
  const distribution: Record<string, number> = {};
  
  spreadsheet.data.forEach(row => {
    const value = row[fieldName];
    if (value !== null && value !== undefined && value !== '') {
      const key = String(value);
      distribution[key] = (distribution[key] || 0) + 1;
    }
  });
  
  return distribution;
};

export const detectInsights = (
  spreadsheetA: ParsedSpreadsheet,
  spreadsheetB: ParsedSpreadsheet
): string[] => {
  const insights: string[] = [];
  const metrics = calculateComparisonMetrics(spreadsheetA, spreadsheetB);
  
  // Total leads insights
  if (Math.abs(metrics.totalLeads.changePercent) > 20) {
    const direction = metrics.totalLeads.change > 0 ? 'aumento' : 'queda';
    insights.push(
      `📊 ${direction.toUpperCase()} significativo de ${Math.abs(metrics.totalLeads.changePercent).toFixed(1)}% no total de leads (${metrics.totalLeads.change > 0 ? '+' : ''}${metrics.totalLeads.change} leads)`
    );
  }
  
  // Conversion rate insights
  if (Math.abs(metrics.conversionRate.changePercent) > 15) {
    const direction = metrics.conversionRate.change > 0 ? 'melhora' : 'queda';
    insights.push(
      `${metrics.conversionRate.change > 0 ? '✅' : '⚠️'} ${direction.toUpperCase()} de ${Math.abs(metrics.conversionRate.changePercent).toFixed(1)}% na taxa de conversão`
    );
  }
  
  // Closing time insights
  if (Math.abs(metrics.avgClosingTime.changePercent) > 20 && metrics.avgClosingTime.value > 0) {
    const direction = metrics.avgClosingTime.change > 0 ? 'aumento' : 'redução';
    insights.push(
      `⏱️ ${direction.toUpperCase()} de ${Math.abs(metrics.avgClosingTime.changePercent).toFixed(1)}% no tempo médio de fechamento (${Math.abs(metrics.avgClosingTime.change).toFixed(1)} dias)`
    );
  }
  
  return insights;
};
