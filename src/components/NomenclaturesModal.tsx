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
                  <h3 className="font-semibold text-base mb-3 text-primary">Total de Leads</h3>
                  <p className="text-muted-foreground mb-2">
                    Número total de leads criados no período selecionado
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    COUNT(leads WHERE created_at BETWEEN date_from AND date_to)
                  </code>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3 text-success">Valor Total</h3>
                  <p className="text-muted-foreground mb-2">
                    Soma do valor de todos os leads ganhos no período
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    SUM(price WHERE status = 'won' AND closed_at BETWEEN dates)
                  </code>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Ticket Médio</h3>
                  <p className="text-muted-foreground mb-2">
                    Valor médio dos negócios ganhos
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    Valor Total ÷ Número de Leads Ganhos
                  </code>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3 text-primary">Taxa de Conversão</h3>
                  <p className="text-muted-foreground mb-2">
                    Percentual de leads ganhos em relação ao total de leads fechados (ganhos + perdidos)
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    (Leads Ganhos ÷ (Leads Ganhos + Leads Perdidos)) × 100%
                  </code>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3 text-info">Leads em Aberto</h3>
                  <p className="text-muted-foreground mb-2">
                    Leads ativos no funil (não ganhos nem perdidos)
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    COUNT(leads WHERE closed_at IS NULL)
                  </code>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3 text-success">Leads Ganhos</h3>
                  <p className="text-muted-foreground mb-2">
                    Leads convertidos em vendas no período
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    COUNT(leads WHERE status.type = 'won')
                  </code>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3 text-destructive">Leads Perdidos</h3>
                  <p className="text-muted-foreground mb-2">
                    Leads que não converteram no período
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    COUNT(leads WHERE status.type = 'lost')
                  </code>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">ROI (Retorno sobre Investimento)</h3>
                  <p className="text-muted-foreground mb-2">
                    Retorno calculado baseado no investimento configurado
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block">
                    ((Receita - Investimento) ÷ Investimento) × 100%
                  </code>
                  <div className="text-xs text-muted-foreground mt-2">
                    💡 Configure o investimento no botão "Investimento" no header
                  </div>
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
                  <p className="text-muted-foreground mb-2">
                    Distribuição percentual de leads por estágio. Cores correspondem aos status configurados na Kommo.
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 Localização: Aba "Visão Geral" ou "Análise de Funil"
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Gráfico de Vendas Mensais</h3>
                  <p className="text-muted-foreground mb-2">
                    Vendas realizadas (linha azul) vs metas mensais (linha tracejada). Limitado ao ano atual.
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 Localização: Aba "Performance"
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Jornada do Lead</h3>
                  <p className="text-muted-foreground mb-2">
                    Visualização do fluxo de leads entre estágios com contadores de transições reais.
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 Localização: Aba "Análise de Funil"
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Tempo por Estágio</h3>
                  <p className="text-muted-foreground mb-2">
                    Gráfico de barras mostrando tempo médio de permanência em cada status do pipeline.
                  </p>
                  <code className="bg-background px-3 py-1 rounded text-xs block mt-2">
                    Baseado em (updated_at - created_at) de leads ativos
                  </code>
                  <div className="text-xs text-warning mt-2 bg-warning/10 p-2 rounded">
                    ⚠️ Limitado a 90 dias para evitar distorções
                  </div>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Análise Comportamental</h3>
                  <p className="text-muted-foreground mb-2">
                    Métricas de engajamento: taxa de resposta, tempo de resposta e frequência de interações.
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 Localização: Aba "Comportamento"
                  </div>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Comparador de Tags</h3>
                  <p className="text-muted-foreground mb-2">
                    Comparação de performance de leads por tags/etiquetas aplicadas.
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 Localização: Aba "Análise Avançada"
                  </div>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Campos Personalizados</h3>
                  <p className="text-muted-foreground mb-2">
                    Análise estatística de campos customizados (texto, select, numéricos).
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 Localização: Aba "Análise Avançada"
                  </div>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Formatos de Tempo</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-success/10 rounded"><strong>&lt; 24h:</strong> Horas (18h)</div>
                    <div className="p-2 bg-info/10 rounded"><strong>1-6 dias:</strong> Dias (5d)</div>
                    <div className="p-2 bg-warning/10 rounded"><strong>7+ dias:</strong> Semanas (3sem)</div>
                    <div className="p-2 bg-muted rounded"><strong>30+ dias:</strong> Meses (2m)</div>
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
                  <div className="space-y-2 mb-3">
                    <div><strong>Critério:</strong> Valor total de vendas ganhas (price de leads won)</div>
                    <div><strong>Filtros:</strong> Respeita pipeline e período selecionados</div>
                    <div><strong>Métricas por vendedor:</strong></div>
                  </div>
                  <ul className="text-xs space-y-1 ml-4">
                    <li>• Volume total de vendas (R$)</li>
                    <li>• Quantidade de leads ganhos</li>
                    <li>• Ticket médio individual</li>
                    <li>• Percentual do total da equipe</li>
                  </ul>
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 Localização: Aba "Performance"
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Análise Comportamental</h3>
                  <div className="space-y-2">
                    <div><strong>Padrões de Engajamento:</strong> Frequência e tipo de interações com leads</div>
                    <div><strong>Tempo de Resposta:</strong> Velocidade média de retorno aos contatos</div>
                    <div><strong>Alertas Comportamentais:</strong> Identificação de leads com baixo engajamento ou risco de perda</div>
                    <div><strong>Score de Qualificação:</strong> Pontuação baseada em comportamento histórico</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    📍 Localização: Aba "Comportamento"
                  </div>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Insights Preditivos (IA)</h3>
                  <div className="space-y-2">
                    <div><strong>Probabilidade de Fechamento:</strong> Score preditivo baseado em histórico e padrões</div>
                    <div><strong>Tendências Identificadas:</strong> Análise de padrões de sucesso/fracasso</div>
                    <div><strong>Recomendações:</strong> Ações sugeridas pela IA para melhorar resultados</div>
                    <div><strong>Leads em Risco:</strong> Identificação proativa de oportunidades que precisam atenção</div>
                  </div>
                  <div className="text-xs text-info mt-2 bg-info/10 p-2 rounded flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Configure o contexto da IA no botão "Config. IA" no header
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
                  <h3 className="font-semibold text-base mb-3">Filtros Globais</h3>
                  <div className="space-y-2">
                    <div><strong>Período:</strong> Última semana, mês, 3 meses, ano ou personalizado</div>
                    <div><strong>Pipeline:</strong> Todos os pipelines ou específico</div>
                    <div><strong>Vendedor:</strong> Toda equipe ou usuário específico</div>
                  </div>
                  <div className="text-xs text-info mt-2 bg-info/10 p-2 rounded">
                    ℹ️ Filtros aplicam-se a todo o dashboard simultaneamente
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Base de Cálculo</h3>
                  <div className="space-y-1">
                    <div><strong>created_at:</strong> Data de criação do lead (base principal)</div>
                    <div><strong>closed_at:</strong> Data de fechamento (ganho/perdido)</div>
                    <div><strong>updated_at:</strong> Última atualização do lead</div>
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Configuração de Investimento</h3>
                  <p className="text-muted-foreground mb-2">
                    Defina custos mensais para cálculo de ROI e métricas financeiras
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Acesse via botão "Investimento" no header do dashboard
                  </div>
                </div>

                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Configuração da IA</h3>
                  <p className="text-muted-foreground mb-2">
                    Personalize o comportamento do assistente de IA
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>• Contexto do negócio e particularidades</li>
                    <li>• Tom de voz (formal, casual, técnico)</li>
                    <li>• Instruções especiais e preferências</li>
                  </ul>
                  <div className="text-xs text-muted-foreground mt-2">
                    Acesse via botão "Config. IA" no header
                  </div>
                </div>
                
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h3 className="font-semibold text-base mb-3">Tipos de Campos Personalizados</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted rounded"><strong>Text:</strong> Texto livre</div>
                    <div className="p-2 bg-muted rounded"><strong>Textarea:</strong> Texto longo</div>
                    <div className="p-2 bg-muted rounded"><strong>Select:</strong> Opção única</div>
                    <div className="p-2 bg-muted rounded"><strong>Multiselect:</strong> Múltiplas</div>
                    <div className="p-2 bg-muted rounded"><strong>Numeric:</strong> Números</div>
                    <div className="p-2 bg-muted rounded"><strong>Checkbox:</strong> Sim/Não</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ⚠️ LIMITAÇÕES E CONSIDERAÇÕES */}
            <div className="border-l-4 border-destructive pl-4">
              <h2 className="text-xl font-bold text-destructive mb-4 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                Limitações e Considerações Importantes
              </h2>
              
              <div className="bg-destructive/5 p-4 rounded-lg border border-destructive/20">
                <div className="grid gap-3 text-sm">
                  <div>
                    <strong>Cálculos Temporais:</strong> Baseados em created_at, updated_at e closed_at da API Kommo. 
                    Tempos por estágio são estimativas, não valores exatos de tracking.
                  </div>
                  <div>
                    <strong>Limite de 90 dias:</strong> Análises temporais limitadas a 90 dias para evitar 
                    distorções causadas por leads muito antigos parados.
                  </div>
                  <div>
                    <strong>Leads "Não Organizados":</strong> Ignorados automaticamente em todas as análises 
                    (campo is_unsorted = true na API).
                  </div>
                  <div>
                    <strong>Sincronização:</strong> Dados em tempo real via API Kommo. 
                    Use o botão "Atualizar" para sincronizar manualmente.
                  </div>
                  <div>
                    <strong>Cache Local:</strong> Alguns dados são cacheados localmente por 5 minutos 
                    para melhorar performance. Atualize manualmente quando necessário.
                  </div>
                  <div>
                    <strong>Moeda:</strong> Todos os valores monetários são exibidos em Real (R$) brasileiro. 
                    Formatação automática com separadores de milhares.
                  </div>
                  <div>
                    <strong>Taxa de Conversão:</strong> Calculada apenas sobre leads fechados (ganhos + perdidos). 
                    Leads em aberto não entram no cálculo.
                  </div>
                  <div>
                    <strong>Assistente IA:</strong> Respostas baseadas nos dados do dashboard atual. 
                    Configure o contexto via "Config. IA" para respostas mais precisas.
                  </div>
                  <div>
                    <strong>Gráficos de Vendas:</strong> Limitados ao ano atual para manter precisão 
                    e relevância das análises.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};