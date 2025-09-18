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
  BookOpen
} from "lucide-react";

interface NomenclaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NomenclaturesModal = ({ open, onOpenChange }: NomenclaturesModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-gradient-card border-border/50 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Nomenclaturas e Conceitos do Dashboard
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 h-[calc(85vh-120px)]">
          <div className="space-y-6">
            
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