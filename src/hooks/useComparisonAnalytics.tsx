import { useMemo } from 'react';
import { ParsedSpreadsheet } from '@/utils/spreadsheetParser';
import {
  calculateComparisonMetrics,
  calculateFieldDistribution,
  detectInsights,
  ComparisonMetrics,
} from '@/utils/comparisonMetrics';

export const useComparisonAnalytics = (
  spreadsheetA: ParsedSpreadsheet | null,
  spreadsheetB: ParsedSpreadsheet | null
) => {
  const metrics = useMemo<ComparisonMetrics | null>(() => {
    if (!spreadsheetA || !spreadsheetB) return null;
    return calculateComparisonMetrics(spreadsheetA, spreadsheetB);
  }, [spreadsheetA, spreadsheetB]);

  const insights = useMemo<string[]>(() => {
    if (!spreadsheetA || !spreadsheetB) return [];
    return detectInsights(spreadsheetA, spreadsheetB);
  }, [spreadsheetA, spreadsheetB]);

  const getFieldComparison = useMemo(() => {
    return (fieldName: string) => {
      if (!spreadsheetA || !spreadsheetB) return null;

      const distA = calculateFieldDistribution(spreadsheetA, fieldName);
      const distB = calculateFieldDistribution(spreadsheetB, fieldName);

      return { distA, distB };
    };
  }, [spreadsheetA, spreadsheetB]);

  return {
    metrics,
    insights,
    getFieldComparison,
  };
};
