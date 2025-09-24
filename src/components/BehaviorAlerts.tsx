import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  Target, 
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Pipeline, Lead, User } from "@/services/kommoApi";

interface BehaviorAlertsProps {
  allLeads: Lead[];
  pipelines: Pipeline[];
  users: User[];
  behaviorMetrics: any;
}

interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  icon: any;
  title: string;
  description: string;
  leads?: Lead[];
  action?: string;
  priority: number;
}

export const BehaviorAlerts = ({ 
  allLeads, 
  pipelines, 
  users, 
  behaviorMetrics 
}: BehaviorAlertsProps) => {

  const alerts = useMemo((): AlertItem[] => {
    const alertsList: AlertItem[] = [];
    const now = Date.now();

    // Critical: Leads dormentes há muito tempo
    const dormantLeads = allLeads.filter(lead => {
      if (lead.closed_at) return false;
      const daysSinceUpdate = (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
      return daysSinceUpdate > 14;
    });

    if (dormantLeads.length > 0) {
      alertsList.push({
        id: 'dormant-leads',
        type: 'critical',
        icon: Clock,
        title: `${dormantLeads.length} leads sem atividade há mais de 14 dias`,
        description: 'Leads com risco crítico de abandono. Necessário contato imediato.',
        leads: dormantLeads.slice(0, 5),
        action: 'Revisar e contactar',
        priority: 1
      });
    }

    // Warning: Leads de alto valor parados
    const highValueStuckLeads = allLeads.filter(lead => {
      if (lead.closed_at) return false;
      const daysSinceUpdate = (now - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
      return daysSinceUpdate > 7 && (lead.price || 0) > 5000;
    });

    if (highValueStuckLeads.length > 0) {
      alertsList.push({
        id: 'high-value-stuck',
        type: 'warning',
        icon: Target,
        title: `${highValueStuckLeads.length} leads de alto valor precisam de follow-up`,
        description: 'Oportunidades valiosas que podem estar perdendo momento.',
        leads: highValueStuckLeads.slice(0, 5),
        action: 'Priorizar contato',
        priority: 2
      });
    }

    // Warning: Queda na taxa de conversão
    if (behaviorMetrics && behaviorMetrics.conversionRate < 20) {
      alertsList.push({
        id: 'low-conversion',
        type: 'warning',
        icon: TrendingDown,
        title: 'Taxa de conversão abaixo do esperado',
        description: `Taxa atual: ${behaviorMetrics.conversionRate.toFixed(1)}%. Considere revisar estratégias.`,
        action: 'Analisar processos',
        priority: 3
      });
    }

    // Info: Leads criados recentemente sem responsável
    const unassignedNewLeads = allLeads.filter(lead => {
      if (lead.closed_at) return false;
      const daysSinceCreated = (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000);
      return daysSinceCreated <= 3 && !lead.responsible_user_id;
    });

    if (unassignedNewLeads.length > 0) {
      alertsList.push({
        id: 'unassigned-new',
        type: 'info',
        icon: AlertCircle,
        title: `${unassignedNewLeads.length} novos leads sem responsável`,
        description: 'Leads recentes que precisam ser distribuídos para a equipe.',
        leads: unassignedNewLeads.slice(0, 5),
        action: 'Atribuir responsável',
        priority: 4
      });
    }

    // Success: Boa performance geral
    if (behaviorMetrics && behaviorMetrics.conversionRate > 40 && behaviorMetrics.dormantLeads < 5) {
      alertsList.push({
        id: 'good-performance',
        type: 'success',
        icon: CheckCircle,
        title: 'Boa performance no pipeline!',
        description: `Taxa de conversão: ${behaviorMetrics.conversionRate.toFixed(1)}%. Continue o bom trabalho!`,
        priority: 5
      });
    }

    // Critical: Muitos leads de risco
    if (behaviorMetrics && behaviorMetrics.highRiskLeads > 20) {
      alertsList.push({
        id: 'many-high-risk',
        type: 'critical',
        icon: AlertTriangle,
        title: `${behaviorMetrics.highRiskLeads} leads classificados como alto risco`,
        description: 'Volume alto de leads em risco de abandono. Revisar estratégia geral.',
        action: 'Revisar estratégia',
        priority: 1
      });
    }

    // Warning: Leads antigos no pipeline
    const oldLeads = allLeads.filter(lead => {
      if (lead.closed_at) return false;
      const daysSinceCreated = (now - (lead.created_at * 1000)) / (24 * 60 * 60 * 1000);
      return daysSinceCreated > 90;
    });

    if (oldLeads.length > 10) {
      alertsList.push({
        id: 'old-leads',
        type: 'warning',
        icon: Clock,
        title: `${oldLeads.length} leads há mais de 90 dias no pipeline`,
        description: 'Leads antigos que podem precisar de limpeza ou reativação.',
        action: 'Limpar pipeline',
        priority: 3
      });
    }

    return alertsList.sort((a, b) => a.priority - b.priority);
  }, [allLeads, behaviorMetrics, pipelines, users]);

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'default';
      case 'success': return 'default';
      default: return 'default';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-warning';
      case 'info': return 'text-info';
      case 'success': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Central de Alertas Comportamentais
          </CardTitle>
          <CardDescription>
            Notificações inteligentes baseadas nos padrões de atividade dos leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {alerts.filter(a => a.type === 'critical').length}
              </div>
              <div className="text-sm text-muted-foreground">Críticos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {alerts.filter(a => a.type === 'warning').length}
              </div>
              <div className="text-sm text-muted-foreground">Avisos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">
                {alerts.filter(a => a.type === 'info').length}
              </div>
              <div className="text-sm text-muted-foreground">Informativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {alerts.filter(a => a.type === 'success').length}
              </div>
              <div className="text-sm text-muted-foreground">Positivos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-lg font-semibold">Tudo está funcionando bem!</p>
              <p className="text-muted-foreground">Nenhum alerta comportamental no momento.</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => {
            const IconComponent = alert.icon;
            
            return (
              <Alert key={alert.id} variant={getAlertVariant(alert.type)} className="border-border/50">
                <IconComponent className={`h-4 w-4 ${getAlertColor(alert.type)}`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{alert.title}</div>
                      <AlertDescription className="mt-1">
                        {alert.description}
                      </AlertDescription>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="outline" className={getAlertColor(alert.type)}>
                        {alert.type === 'critical' ? 'Crítico' :
                         alert.type === 'warning' ? 'Aviso' :
                         alert.type === 'info' ? 'Info' : 'Positivo'}
                      </Badge>
                      {alert.action && (
                        <Button size="sm" variant="outline">
                          {alert.action}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Show sample leads if available */}
                  {alert.leads && alert.leads.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/30">
                      <div className="text-sm font-medium mb-2">Exemplos de leads afetados:</div>
                      <div className="space-y-1">
                        {alert.leads.map((lead) => {
                          const pipeline = pipelines.find(p => p.id === lead.pipeline_id);
                          const status = pipeline?.statuses.find(s => s.id === lead.status_id);
                          const user = users.find(u => u.id === lead.responsible_user_id);
                          const daysSinceUpdate = (Date.now() - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
                          
                          return (
                            <div key={lead.id} className="flex items-center justify-between text-xs">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium truncate block">{lead.name}</span>
                                <span className="text-muted-foreground">
                                  {user?.name || 'Sem responsável'} • {status?.name}
                                </span>
                              </div>
                              <div className="text-right ml-2">
                                <div className="font-medium">R$ {((lead.price || 0) / 1000).toFixed(0)}k</div>
                                <div className="text-muted-foreground">
                                  {Math.floor(daysSinceUpdate)}d sem ativ.
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {(alert.leads.length < allLeads.filter(lead => {
                          if (alert.id === 'dormant-leads') {
                            const daysSinceUpdate = (Date.now() - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
                            return !lead.closed_at && daysSinceUpdate > 14;
                          }
                          return false;
                        }).length) && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            E mais {allLeads.filter(lead => {
                              if (alert.id === 'dormant-leads') {
                                const daysSinceUpdate = (Date.now() - (lead.updated_at * 1000)) / (24 * 60 * 60 * 1000);
                                return !lead.closed_at && daysSinceUpdate > 14;
                              }
                              return false;
                            }).length - alert.leads.length} leads...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Alert>
            );
          })
        )}
      </div>

      {/* Alert Configuration */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Configurações de Alertas</CardTitle>
          <CardDescription>
            Personalize os thresholds e tipos de alertas que deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>• <strong>Leads Dormentes:</strong> Sem atividade há mais de 14 dias</p>
              <p>• <strong>Alto Valor:</strong> Leads acima de R$ 5.000 sem follow-up há 7+ dias</p>
              <p>• <strong>Taxa de Conversão:</strong> Alerta quando abaixo de 20%</p>
              <p>• <strong>Leads Antigos:</strong> No pipeline há mais de 90 dias</p>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Os alertas são atualizados automaticamente com base nos dados mais recentes. 
                Configure thresholds personalizados nas configurações do sistema.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};