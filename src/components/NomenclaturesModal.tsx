import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calculator, 
  TrendingUp, 
  PieChart, 
  Trophy, 
  Settings, 
  Filter,
  BookOpen,
  Clock,
  AlertTriangle,
  Target,
  BarChart3,
  Brain
} from "lucide-react";

interface NomenclaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NomenclaturesModal = ({ open, onOpenChange }: NomenclaturesModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-gradient-card border-border/50 p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Nomenclaturas e Conceitos do Dashboard
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-8 pb-4">
            
            {/* 📊 MÉTRICAS E INDICADORES */}
            <div className="border-l-4 border-primary pl-4">
              <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                Métricas e Indicadores
              </h2>
              
              <div className="grid gap-4 text-sm">
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3 text-primary">Taxa de Fechamento (Histórico)</h3>
                  <p className="text-muted-foreground mb-2">
                    Percentual de leads <strong>ganhos</strong> em relação ao total histórico de leads
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    (Leads Ganhos ÷ Total de Leads Históricos) × 100%
                  </code>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3 text-info">Taxa de Conclusão</h3>
                  <p className="text-muted-foreground mb-2">
                    Percentual de leads <strong>fechados</strong> (ganhos + perdidos) vs total de leads
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    (Leads Fechados ÷ Total de Leads) × 100%
                  </code>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3 text-warning">Taxa de Fechamento do Período</h3>
                  <p className="text-muted-foreground mb-2">
                    Percentual de leads <strong>ganhos</strong> apenas no período selecionado
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    (Leads Ganhos no Período ÷ Leads do Período) × 100%
                  </code>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">ROI (Retorno sobre Investimento)</h3>
                  <p className="text-muted-foreground mb-2">
                    Estimativa de retorno baseada na receita gerada
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    (Receita - Custo Estimado) ÷ Custo Estimado × 100%
                  </code>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Ticket Médio</h3>
                  <p className="text-muted-foreground mb-2">
                    Valor médio por lead ativo no funil de vendas
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    Receita Total ÷ Número de Leads Ativos
                  </code>
                </div>
              </div>
            </div>

            {/* ⏱️ ANÁLISE TEMPORAL */}
            <div className="border-l-4 border-info pl-4">
              <h2 className="text-xl font-bold text-info mb-4 flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Análise Temporal
              </h2>
              
              <div className="grid gap-4 text-sm">
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Modos de Visualização</h3>
                  <div className="space-y-2">
                    <div><strong>Visão Geral:</strong> Distribuição atual de leads por status</div>
                    <div><strong>Tempo Conversão:</strong> Análise detalhada de performance temporal</div>
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Tempo Médio de Conversão</h3>
                  <p className="text-muted-foreground mb-2">
                    Tempo real para conversão completa de leads fechados
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    (Data Fechamento - Data Criação) ÷ Total de Leads Fechados
                  </code>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Tempo por Estágio</h3>
                  <p className="text-muted-foreground mb-2">
                    Estimativa baseada em leads ativos em cada status atual
                  </p>
                  <div className="text-xs text-warning mt-2 bg-warning/10 p-2 rounded">
                    ⚠️ Limitado a 90 dias para evitar distorções de leads antigos
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Leads Críticos</h3>
                  <p className="text-muted-foreground mb-2">
                    Leads parados há mais de 30 dias sem atualização
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    (Hoje - Última Atualização) &gt; 30 dias
                  </code>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Classificação de Velocidade</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-success/10 rounded"><strong>0-7 dias:</strong> Rápidas</div>
                    <div className="p-2 bg-info/10 rounded"><strong>1-4 semanas:</strong> Normais</div>
                    <div className="p-2 bg-warning/10 rounded"><strong>1-3 meses:</strong> Lentas</div>
                    <div className="p-2 bg-destructive/10 rounded"><strong>3+ meses:</strong> Muito Lentas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 📈 GRÁFICOS E VISUALIZAÇÕES */}
            <div className="border-l-4 border-warning pl-4">
              <h2 className="text-xl font-bold text-warning mb-4 flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Gráficos e Visualizações
              </h2>
              
              <div className="grid gap-4 text-sm">
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Gráfico de Pipeline</h3>
                  <p className="text-muted-foreground">
                    Distribuição percentual de leads por estágio. Cores correspondem aos status da Kommo.
                  </p>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Gráfico de Vendas Mensais</h3>
                  <p className="text-muted-foreground">
                    Vendas realizadas vs metas mensais. Limitado ao ano atual para precisão.
                  </p>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Jornada do Pipeline</h3>
                  <p className="text-muted-foreground">
                    Fluxo de leads entre estágios com contadores de transições no período.
                  </p>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Tempo por Estágio (Barras)</h3>
                  <p className="text-muted-foreground">
                    Tempo médio de permanência em cada status do pipeline selecionado.
                  </p>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Formatos de Tempo</h3>
                  <div className="space-y-1">
                    <div><strong>&lt; 24h:</strong> Exibido em horas (ex: 18h)</div>
                    <div><strong>1-6 dias:</strong> Exibido em dias (ex: 5d)</div>
                    <div><strong>7+ dias:</strong> Exibido em semanas (ex: 3sem)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 🏆 PERFORMANCE E RANKING */}
            <div className="border-l-4 border-success pl-4">
              <h2 className="text-xl font-bold text-success mb-4 flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Performance e Ranking
              </h2>
              
              <div className="grid gap-4 text-sm">
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Ranking de Vendedores</h3>
                  <div className="space-y-2">
                    <div><strong>Critério:</strong> Valor total de vendas fechadas/ganhas</div>
                    <div><strong>Filtros:</strong> Pipeline + período selecionados</div>
                    <div><strong>Métricas:</strong> Volume, quantidade, ticket médio individual</div>
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Análise Comportamental</h3>
                  <div className="space-y-2">
                    <div><strong>Padrões de Engajamento:</strong> Frequência de interações</div>
                    <div><strong>Tempo de Resposta:</strong> Velocidade média de retorno</div>
                    <div><strong>Alertas Comportamentais:</strong> Leads com baixo engajamento</div>
                  </div>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Insights Preditivos</h3>
                  <div className="space-y-2">
                    <div><strong>Probabilidade de Fechamento:</strong> Baseada em histórico</div>
                    <div><strong>Tendências:</strong> Padrões identificados</div>
                    <div><strong>Recomendações:</strong> Ações sugeridas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ⚙️ CONFIGURAÇÕES E FILTROS */}
            <div className="border-l-4 border-muted-foreground pl-4">
              <h2 className="text-xl font-bold text-muted-foreground mb-4 flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Configurações e Filtros
              </h2>
              
              <div className="grid gap-4 text-sm">
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Filtros de Data</h3>
                  <div className="space-y-1">
                    <div><strong>Base:</strong> Data de criação dos leads</div>
                    <div><strong>Opções:</strong> Última semana, mês, 3 meses, ano, personalizado</div>
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Filtros de Pipeline</h3>
                  <p className="text-muted-foreground">
                    Análise isolada por funil. Cada pipeline mantém estágios e métricas próprios.
                  </p>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Campos Personalizados</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><strong>Text/Textarea:</strong> Texto livre</div>
                    <div><strong>Select:</strong> Opção única</div>
                    <div><strong>Multiselect:</strong> Múltiplas opções</div>
                    <div><strong>Numeric:</strong> Valores numéricos</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ⚠️ LIMITAÇÕES E CONSIDERAÇÕES */}
            <div className="border-l-4 border-destructive pl-4">
              <h2 className="text-xl font-bold text-destructive mb-4 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                Limitações e Considerações
              </h2>
              
              <div className="bg-destructive/5 p-4 rounded-lg border border-destructive/20">
                <div className="grid gap-3 text-sm">
                  <div><strong>Cálculos Básicos:</strong> Baseados em created_at, updated_at e closed_at</div>
                  <div><strong>Tempos Estimados:</strong> Não são exatos, são aproximações</div>
                  <div><strong>Leads Excluídos:</strong> "Não organizados" são ignorados</div>
                  <div><strong>Limite Temporal:</strong> 90 dias para evitar distorções</div>
                  <div><strong>Sincronização:</strong> Tempo real com API da Kommo</div>
                  <div><strong>Moeda:</strong> Valores em Real (R$) brasileiro</div>
                  <div><strong>Cache:</strong> Atualizado a cada refresh manual</div>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};