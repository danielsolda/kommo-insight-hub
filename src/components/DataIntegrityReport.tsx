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
    completedFully?: boolean;
    analysisTime?: number;
  };
  leadsIntegrity?: {
    isLoading: boolean;
    completedFully: boolean;
    errors: string[];
  };
  unsortedIntegrity?: {
    isLoading: boolean;
    completedFully: boolean;
    errors: string[];
  };
  progress?: {
    status: string;
    progress: number;
  };
  isLoading?: boolean;
}

export const DataIntegrityReport = ({ 
  integrity, 
  leadsIntegrity,
  unsortedIntegrity,
  progress,
  isLoading = false
}: DataIntegrityReportProps) => {
  // Inicializar com valores padrão seguros se não há dados
  const defaultIntegrity = {
    totalLeads: 0,
    totalUnsorted: 0,
    pipelineCounts: [],
    missingData: ['Dados não disponíveis. Clique em "Atualizar" para carregar.'],
    dataQuality: 0,
    completedFully: false,
    analysisTime: 0
  };

  // Validação robusta dos dados de entrada
  const safeIntegrity = integrity ? {
    totalLeads: integrity.totalLeads || 0,
    totalUnsorted: integrity.totalUnsorted || 0,
    pipelineCounts: Array.isArray(integrity.pipelineCounts) ? integrity.pipelineCounts : [],
    missingData: Array.isArray(integrity.missingData) ? integrity.missingData : ['Dados não disponíveis'],
    dataQuality: typeof integrity.dataQuality === 'number' ? integrity.dataQuality : 0,
    completedFully: integrity.completedFully || false,
    analysisTime: integrity.analysisTime || 0
  } : defaultIntegrity;

  // Se não há dados de integridade e não está carregando, mostrar estado vazio
  if (!integrity && !isLoading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Relatório de Integridade de Dados</CardTitle>
          <CardDescription>
            Análise não disponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Database className="h-16 w-16 mx-auto opacity-30" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Dados de integridade não encontrados</p>
              <p className="text-muted-foreground">
                Clique no botão "Atualizar" no topo da página para gerar o relatório de integridade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verificar se integrity existe antes de usar suas propriedades
  // Usar os dados validados

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

  const getStatusBadge = (completed?: boolean, hasErrors?: boolean) => {
    if (completed) return <Badge variant="default" className="bg-success/10 text-success border-success/20">Completo</Badge>;
    if (hasErrors) return <Badge variant="destructive">Com Erros</Badge>;
    return <Badge variant="secondary">Parcial</Badge>;
  };

  // Mostrar progresso se estiver carregando
  if (isLoading && progress) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Análise de Integridade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-lg">{progress.status}</span>
            </div>
            <Progress value={progress.progress} className="w-full" />
            <p className="text-muted-foreground text-sm">
              {progress.progress}% - Análise otimizada (máximo 2 minutos)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-2xl font-bold">
          Relatório de Integridade de Dados
          {safeIntegrity.analysisTime && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (análise em {safeIntegrity.analysisTime.toFixed(1)}s)
            </span>
          )}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {getQualityIcon(safeIntegrity.dataQuality)}
          <span className="text-sm font-medium">
            Qualidade: {safeIntegrity.dataQuality}%
          </span>
          {!safeIntegrity.completedFully && (
            <Badge variant="outline" className="text-orange-600">
              Parcial
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Score Geral de Qualidade */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getQualityIcon(safeIntegrity.dataQuality)}
              <span className="font-medium">Score de Qualidade</span>
            </div>
            <span className={`text-lg font-bold ${getQualityColor(safeIntegrity.dataQuality)}`}>
              {safeIntegrity.dataQuality}%
            </span>
          </div>
          <Progress 
            value={safeIntegrity.dataQuality} 
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
            <div className="text-xl font-bold">{safeIntegrity.totalLeads.toLocaleString()}</div>
          </div>
          
          <div className="text-center space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Não Organizados</span>
            </div>
            <div className="text-xl font-bold">{safeIntegrity.totalUnsorted.toLocaleString()}</div>
          </div>

          <div className="text-center space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pipelines</span>
            </div>
            <div className="text-xl font-bold">{safeIntegrity.pipelineCounts.length}</div>
          </div>

          <div className="text-center space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Geral</span>
            </div>
            <div className="text-xl font-bold">{(safeIntegrity.totalLeads + safeIntegrity.totalUnsorted).toLocaleString()}</div>
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
                      {leadsIntegrity.errors?.length || 0} erros
                    </div>
                  </div>
                  {getStatusBadge(leadsIntegrity.completedFully, (leadsIntegrity.errors?.length || 0) > 0)}
                </div>
              )}

              {unsortedIntegrity && (
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <span className="font-medium">Leads Não Organizados</span>
                    <div className="text-sm text-muted-foreground">
                      {unsortedIntegrity.errors?.length || 0} erros
                    </div>
                  </div>
                  {getStatusBadge(unsortedIntegrity.completedFully, (unsortedIntegrity.errors?.length || 0) > 0)}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Distribuição por Pipeline */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Distribuição por Pipeline</h4>
          <div className="space-y-2">
            {safeIntegrity.pipelineCounts.length > 0 ? (
              safeIntegrity.pipelineCounts.map((pipeline) => (
                <div key={pipeline.id} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
                  <span className="font-medium truncate">{pipeline.name}</span>
                  <Badge variant="outline">{pipeline.count.toLocaleString()}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Nenhum pipeline encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertas de Problemas */}
        {safeIntegrity.missingData.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Problemas Detectados
            </h4>
            {safeIntegrity.missingData.map((issue, index) => (
              <Alert key={index} className="border-warning/20 bg-warning/5">
                <AlertDescription className="text-sm">
                  {issue}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Recomendações */}
        {safeIntegrity.dataQuality < 90 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recomendações</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {safeIntegrity.dataQuality < 70 && (
                <div>• Verificar configuração da API da Kommo</div>
              )}
              {leadsIntegrity && !leadsIntegrity.completedFully && (
                <div>• Aumentar timeout para contas com muitos leads</div>
              )}
              {safeIntegrity.missingData.some(issue => issue.includes('valor')) && (
                <div>• Revisar preenchimento de valores nos leads</div>
              )}
              {safeIntegrity.missingData.some(issue => issue.includes('pipeline')) && (
                <div>• Verificar configuração de pipelines na Kommo</div>
              )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};