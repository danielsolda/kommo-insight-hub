import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, XCircle, BarChart3, Database, Clock, Target } from "lucide-react";

interface DataIntegrityReportProps {
  integrity: {
    totalLeads: number;
    totalUnsorted: number;
    pipelineCounts: Array<{ id: number; name: string; count: number }>;
    missingData: string[];
    dataQuality: number;
  };
  leadsIntegrity?: {
    totalLoaded: number;
    pagesProcessed: number;
    errors: string[];
    timedOut: boolean;
    completedFully: boolean;
  };
  unsortedIntegrity?: {
    totalLoaded: number;
    pagesProcessed: number;
    errors: string[];
    timedOut: boolean;
    completedFully: boolean;
  };
}

export const DataIntegrityReport = ({ 
  integrity, 
  leadsIntegrity,
  unsortedIntegrity 
}: DataIntegrityReportProps) => {
  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  const getQualityIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4 text-success" />;
    if (score >= 70) return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getStatusBadge = (completed: boolean, timedOut: boolean) => {
    if (completed) return <Badge variant="default" className="bg-success/10 text-success border-success/20">Completo</Badge>;
    if (timedOut) return <Badge variant="destructive">Timeout</Badge>;
    return <Badge variant="secondary">Parcial</Badge>;
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Relatório de Integridade dos Dados
        </CardTitle>
        <CardDescription>
          Análise da completude e qualidade dos dados carregados da Kommo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Score Geral de Qualidade */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getQualityIcon(integrity.dataQuality)}
              <span className="font-medium">Score de Qualidade</span>
            </div>
            <span className={`text-lg font-bold ${getQualityColor(integrity.dataQuality)}`}>
              {integrity.dataQuality}%
            </span>
          </div>
          <Progress 
            value={integrity.dataQuality} 
            className="h-2"
          />
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total de Leads</span>
            </div>
            <div className="text-xl font-bold">{integrity.totalLeads.toLocaleString()}</div>
          </div>
          
          <div className="text-center space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Não Organizados</span>
            </div>
            <div className="text-xl font-bold">{integrity.totalUnsorted.toLocaleString()}</div>
          </div>

          <div className="text-center space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pipelines</span>
            </div>
            <div className="text-xl font-bold">{integrity.pipelineCounts.length}</div>
          </div>

          <div className="text-center space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Geral</span>
            </div>
            <div className="text-xl font-bold">{(integrity.totalLeads + integrity.totalUnsorted).toLocaleString()}</div>
          </div>
        </div>

        {/* Status de Carregamento */}
        {(leadsIntegrity || unsortedIntegrity) && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Status do Carregamento</h4>
            <div className="grid gap-3">
              
              {leadsIntegrity && (
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <span className="font-medium">Leads Organizados</span>
                    <div className="text-sm text-muted-foreground">
                      {leadsIntegrity.pagesProcessed} páginas • {leadsIntegrity.errors.length} erros
                    </div>
                  </div>
                  {getStatusBadge(leadsIntegrity.completedFully, leadsIntegrity.timedOut)}
                </div>
              )}

              {unsortedIntegrity && (
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <span className="font-medium">Leads Não Organizados</span>
                    <div className="text-sm text-muted-foreground">
                      {unsortedIntegrity.pagesProcessed} páginas • {unsortedIntegrity.errors.length} erros
                    </div>
                  </div>
                  {getStatusBadge(unsortedIntegrity.completedFully, unsortedIntegrity.timedOut)}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Distribuição por Pipeline */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Distribuição por Pipeline</h4>
          <div className="space-y-2">
            {integrity.pipelineCounts.map((pipeline) => (
              <div key={pipeline.id} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
                <span className="font-medium truncate">{pipeline.name}</span>
                <Badge variant="outline">{pipeline.count.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas de Problemas */}
        {integrity.missingData.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Problemas Detectados
            </h4>
            {integrity.missingData.map((issue, index) => (
              <Alert key={index} className="border-warning/20 bg-warning/5">
                <AlertDescription className="text-sm">
                  {issue}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Recomendações */}
        {integrity.dataQuality < 90 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recomendações</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {integrity.dataQuality < 70 && (
                <div>• Verificar configuração da API da Kommo</div>
              )}
              {leadsIntegrity && !leadsIntegrity.completedFully && (
                <div>• Aumentar timeout para contas com muitos leads</div>
              )}
              {integrity.missingData.some(issue => issue.includes('valor')) && (
                <div>• Revisar preenchimento de valores nos leads</div>
              )}
              {integrity.missingData.some(issue => issue.includes('pipeline')) && (
                <div>• Verificar configuração de pipelines na Kommo</div>
              )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};