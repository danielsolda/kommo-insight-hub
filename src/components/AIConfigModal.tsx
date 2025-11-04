import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Brain, Save } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AIConfig {
  businessContext: string;
  tone: 'formal' | 'casual' | 'technical';
  specialInstructions: string;
}

const DEFAULT_CONFIG: AIConfig = {
  businessContext: '',
  tone: 'casual',
  specialInstructions: '',
};

export const AIConfigModal = () => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('ai-config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar configurações da IA:', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('ai-config', JSON.stringify(config));
    toast({
      title: 'Configurações salvas!',
      description: 'As preferências da IA foram atualizadas.',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Config. IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Configurações da IA
          </DialogTitle>
          <DialogDescription>
            Personalize como a IA deve se comportar e que informações ela deve conhecer sobre seu negócio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contexto do Negócio */}
          <div className="space-y-2">
            <Label htmlFor="businessContext">Contexto do Negócio</Label>
            <Textarea
              id="businessContext"
              placeholder="Ex: Somos uma empresa de software B2B focada em automação de vendas. Nosso ticket médio é R$ 5.000 e nosso ciclo de vendas dura em média 30 dias..."
              value={config.businessContext}
              onChange={(e) => setConfig({ ...config, businessContext: e.target.value })}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Descreva seu negócio, produtos/serviços, público-alvo e particularidades importantes.
            </p>
          </div>

          {/* Tom de Voz */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tom de Voz</Label>
            <Select
              value={config.tone}
              onValueChange={(value: 'formal' | 'casual' | 'technical') =>
                setConfig({ ...config, tone: value })
              }
            >
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">
                  <div className="space-y-1">
                    <div className="font-medium">Formal</div>
                    <div className="text-xs text-muted-foreground">
                      Linguagem profissional e corporativa
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="casual">
                  <div className="space-y-1">
                    <div className="font-medium">Casual</div>
                    <div className="text-xs text-muted-foreground">
                      Comunicação amigável e direta
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="technical">
                  <div className="space-y-1">
                    <div className="font-medium">Técnico</div>
                    <div className="text-xs text-muted-foreground">
                      Foco em métricas e análises detalhadas
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instruções Especiais */}
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Instruções Especiais</Label>
            <Textarea
              id="specialInstructions"
              placeholder="Ex: Sempre mencione benchmarks do setor quando disponível. Priorize insights acionáveis. Evite jargões técnicos desnecessários..."
              value={config.specialInstructions}
              onChange={(e) =>
                setConfig({ ...config, specialInstructions: e.target.value })
              }
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Preferências adicionais sobre como a IA deve se comportar ou analisar dados.
            </p>
          </div>

          {/* Exemplos de Uso */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              💡 Exemplos de Perguntas
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• "Qual minha taxa de conversão comparada ao mercado?"</li>
              <li>• "Quais leads estão em risco de churn?"</li>
              <li>• "Como melhorar meu tempo de resposta?"</li>
              <li>• "Analise o desempenho da equipe este mês"</li>
              <li>• "Sugira ações para aumentar as vendas"</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
