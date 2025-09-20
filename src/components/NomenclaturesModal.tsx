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
  BarChart3
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
          <div className="space-y-6 pb-4">
            
            {/* Métricas Gerais */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Calculator className="h-5 w-5" />
                Métricas Gerais
              </div>
              <div className="grid gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Taxa de Conversão</h4>
                  <p className="text-muted-foreground mb-2">
                    Percentual de leads que se tornaram vendas fechadas
                  </p>
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    Taxa = (Leads Fechados ÷ Total de Leads) × 100
                  </code>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Ticket Médio</h4>
                  <p className="text-muted-foreground mb-2">
                    Valor médio por lead ativo no funil de vendas
                  </p>
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    Ticket Médio = Receita Total ÷ Leads Ativos
                  </code>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">ROI (Retorno sobre Investimento)</h4>
                  <p className="text-muted-foreground mb-2">
                    Cálculo estimado baseado na receita gerada
                  </p>
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    ROI = (Receita - Custo Estimado) ÷ Custo Estimado × 100
                  </code>
                </div>
              </div>
            </section>

            {/* Análise de Tempo de Conversão */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Clock className="h-5 w-5" />
                Análise de Tempo de Conversão (Aba Pipelines)
              </div>
              <div className="grid gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Alternância de Visualizações</h4>
                  <p className="text-muted-foreground mb-2">
                    Use os botões "Visão Geral" e "Tempo Conversão" para alternar entre:
                  </p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• <strong>Visão Geral:</strong> Distribuição de leads por status</li>
                    <li>• <strong>Tempo Conversão:</strong> Análise temporal detalhada</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Tempo Médio de Conversão</h4>
                  <p className="text-muted-foreground mb-2">
                    Tempo médio para conversão completa de leads fechados
                  </p>
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    Tempo = (Data Fechamento - Data Criação) ÷ Leads Fechados
                  </code>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Tempo Médio por Estágio</h4>
                  <p className="text-muted-foreground mb-2">
                    Estimativa baseada em leads ativos em cada status
                  </p>
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    Tempo Status = Média (Data Atual - Data Criação) por Status
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    *Limitado a 90 dias para evitar distorções de leads muito antigos
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Taxa de Conversão do Pipeline</h4>
                  <p className="text-muted-foreground mb-2">
                    Percentual de leads que foram fechados com sucesso
                  </p>
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    Taxa = (Leads Fechados ÷ Total Leads Pipeline) × 100
                  </code>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Leads Presos (Críticos)</h4>
                  <p className="text-muted-foreground mb-2">
                    Leads que estão há mais de 30 dias sem atualização
                  </p>
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    Crítico = (Data Atual - Última Atualização) &gt; 30 dias
                  </code>
                </div>
              </div>
            </section>

            {/* Gráficos de Tempo */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <BarChart3 className="h-5 w-5" />
                Visualizações de Tempo
              </div>
              <div className="grid gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Gráfico de Tempo por Estágio</h4>
                  <p className="text-muted-foreground">
                    Gráfico de barras mostrando tempo médio em cada etapa do pipeline.
                    Cada barra é colorizada conforme a cor do status na Kommo.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Distribuição de Conversões</h4>
                  <p className="text-muted-foreground mb-2">
                    Classificação dos leads fechados por tempo de conversão:
                  </p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• <strong>0-7 dias:</strong> Conversões rápidas</li>
                    <li>• <strong>1-4 semanas:</strong> Conversões normais</li>
                    <li>• <strong>1-3 meses:</strong> Conversões lentas</li>
                    <li>• <strong>3+ meses:</strong> Conversões muito lentas</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Lista de Leads Críticos</h4>
                  <p className="text-muted-foreground mb-2">
                    Top 10 leads com maior tempo no status atual:
                  </p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• Ordenados por tempo decrescente</li>
                    <li>• Exibe nome do lead, status atual e valor</li>
                    <li>• Indica tempo em formato otimizado (horas/dias/semanas)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Formatos de Tempo */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Target className="h-5 w-5" />
                Formatos de Tempo
              </div>
              <div className="grid gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Conversão Automática de Unidades</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• <strong>Menos de 1 dia:</strong> Exibido em horas (ex: 18h)</li>
                    <li>• <strong>1-6 dias:</strong> Exibido em dias (ex: 5d)</li>
                    <li>• <strong>7+ dias:</strong> Exibido em semanas (ex: 3sem)</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Interpretação dos Tempos</h4>
                  <p className="text-muted-foreground">
                    Tempos mais baixos indicam eficiência no processo de vendas.
                    Tempos muito altos em um estágio específico podem indicar gargalos.
                  </p>
                </div>
              </div>
            </section>

            {/* Limitações e Considerações */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <AlertTriangle className="h-5 w-5" />
                Limitações da Análise de Tempo
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                <ul className="text-sm space-y-2">
                  <li>• <strong>Versão Básica:</strong> Cálculos baseados em created_at, updated_at e closed_at</li>
                  <li>• <strong>Estimativas:</strong> Tempo por status é estimado, não exato</li>
                  <li>• <strong>Leads Não Organizados:</strong> Excluídos da análise temporal</li>
                  <li>• <strong>Limite de 90 dias:</strong> Para evitar distorções de leads muito antigos</li>
                  <li>• <strong>Atualização:</strong> Baseada na última modificação do lead na Kommo</li>
                </ul>
              </div>
            </section>

            {/* Gráficos e Visualizações */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <PieChart className="h-5 w-5" />
                Gráficos e Visualizações
              </div>
              <div className="grid gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Gráfico de Pipeline</h4>
                  <p className="text-muted-foreground">
                    Mostra a distribuição de leads por estágio do funil de vendas. 
                    Cada fatia representa um status específico do pipeline selecionado.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Gráfico de Vendas Mensais</h4>
                  <p className="text-muted-foreground">
                    Compara vendas realizadas vs metas mensais. Exibe apenas dados 
                    até o mês atual do ano corrente para análise precisa de performance.
                  </p>
                </div>
              </div>
            </section>

            {/* Ranking de Vendedores */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Trophy className="h-5 w-5" />
                Ranking de Vendedores
              </div>
              <div className="grid gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Critérios de Ordenação</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Ordenação por valor total de vendas no período</li>
                    <li>• Considera apenas leads com status "fechado/ganho"</li>
                    <li>• Filtrável por pipeline e período de data</li>
                    <li>• Atualização em tempo real conforme dados da Kommo</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Métricas por Vendedor</h4>
                  <p className="text-muted-foreground">
                    Cada vendedor é avaliado pelo volume total de vendas, número de 
                    leads fechados e ticket médio individual no período selecionado.
                  </p>
                </div>
              </div>
            </section>

            {/* Campos Personalizados */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Settings className="h-5 w-5" />
                Análise de Campos Personalizados
              </div>
              <div className="grid gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Correlação Campo vs Status</h4>
                  <p className="text-muted-foreground">
                    Analisa como os valores de campos personalizados se relacionam 
                    com os status dos leads, identificando padrões de conversão.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Tipos de Campo Suportados</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• <strong>Text/Textarea:</strong> Valores de texto livre</li>
                    <li>• <strong>Select:</strong> Opções únicas mapeadas por enum_id</li>
                    <li>• <strong>Multiselect:</strong> Múltiplas opções separadas por vírgula</li>
                    <li>• <strong>Numeric:</strong> Valores numéricos e monetários</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Filtros e Períodos */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Filter className="h-5 w-5" />
                Filtros e Períodos
              </div>
              <div className="grid gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Filtros de Data</h4>
                  <p className="text-muted-foreground">
                    Os períodos são baseados na data de criação dos leads. 
                    Filtros incluem: última semana, último mês, últimos 3 meses, 
                    último ano e período personalizado.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <h4 className="font-medium mb-2">Filtros de Pipeline</h4>
                  <p className="text-muted-foreground">
                    Permite análise isolada de diferentes funis de venda. 
                    Cada pipeline mantém seus próprios estágios e métricas.
                  </p>
                </div>
              </div>
            </section>

            {/* Observações Importantes */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <TrendingUp className="h-5 w-5" />
                Observações Importantes
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                <ul className="text-sm space-y-2">
                  <li>• Os dados são sincronizados em tempo real com a API da Kommo</li>
                  <li>• Valores monetários são exibidos em Real (R$) brasileiro</li>
                  <li>• Leads "Não preenchido" indicam campos sem valor atribuído</li>
                  <li>• O cache local é atualizado a cada refresh manual</li>
                  <li>• Métricas consideram apenas leads ativos no período selecionado</li>
                </ul>
              </div>
            </section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};