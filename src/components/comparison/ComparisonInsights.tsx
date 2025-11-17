import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedSpreadsheet } from "@/utils/spreadsheetParser";
import { useComparisonAnalytics } from "@/hooks/useComparisonAnalytics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LightbulbIcon } from "lucide-react";

interface ComparisonInsightsProps {
  spreadsheetA: ParsedSpreadsheet | null;
  spreadsheetB: ParsedSpreadsheet | null;
}

export const ComparisonInsights = ({ spreadsheetA, spreadsheetB }: ComparisonInsightsProps) => {
  const { insights } = useComparisonAnalytics(spreadsheetA, spreadsheetB);

  if (!spreadsheetA || !spreadsheetB) {
    return null;
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insights Automáticos</CardTitle>
          <CardDescription>Nenhuma variação significativa detectada</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LightbulbIcon className="h-5 w-5 text-primary" />
          <CardTitle>Insights Automáticos</CardTitle>
        </div>
        <CardDescription>Principais mudanças detectadas entre os períodos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => (
          <Alert key={index}>
            <AlertDescription className="text-sm">{insight}</AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
};
