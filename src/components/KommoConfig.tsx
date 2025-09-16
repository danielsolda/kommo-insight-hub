import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Key, Link as LinkIcon, Shield, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { KommoAuthService } from "@/services/kommoAuth";
import { getRedirectUri, getEnvironmentInfo, isGitHubPages } from "@/utils/environment";

interface KommoConfigProps {
  onSave: (config: any) => void;
}

export const KommoConfig = ({ onSave }: KommoConfigProps) => {
  const [config, setConfig] = useState({
    integrationId: '',
    secretKey: '',
    redirectUri: '',
    accountUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Função para normalizar URL da conta
  const normalizeAccountUrl = (url: string): string => {
    if (!url) return '';
    
    // Se já tem protocolo, usar como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Se é só o subdomínio, adicionar protocolo e domínio
    if (url.includes('.kommo.com')) {
      return `https://${url}`;
    }
    
    // Se é só o subdomínio sem .kommo.com, adicionar tudo
    return `https://${url}.kommo.com`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação básica
      if (!config.integrationId || !config.secretKey) {
        throw new Error('Integration ID e Secret Key são obrigatórios');
      }

      // Normalizar URL da conta se fornecida
      const normalizedConfig = {
        ...config,
        accountUrl: config.accountUrl ? normalizeAccountUrl(config.accountUrl) : ''
      };

      // Salvar configuração temporariamente
      localStorage.setItem('kommoConfig', JSON.stringify(normalizedConfig));
      
      // Iniciar processo OAuth
      const authService = new KommoAuthService(normalizedConfig);
      const state = Math.random().toString(36).substring(2, 15);
      const authUrl = authService.generateAuthUrl(state);
      
      toast({
        title: "Redirecionando para a Kommo",
        description: "Você será redirecionado para autorizar a integração.",
      });

      // Salvar state para validação posterior
      localStorage.setItem('kommoOAuthState', state);
      
      // Abrir janela de autorização
      window.location.href = authUrl;
      
    } catch (error) {
      toast({
        title: "Erro na configuração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRedirectUri = () => {
    const redirectUri = getRedirectUri();
    setConfig({ ...config, redirectUri });
  };

  return (
    <Card className="max-w-2xl mx-auto bg-gradient-card border-border/50 shadow-elegant">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-lg bg-gradient-primary shadow-glow">
            <Settings className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl">Configurar Integração Kommo</CardTitle>
        <CardDescription>
          Configure suas credenciais OAuth para conectar com a API da Kommo
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Suas credenciais são armazenadas localmente no navegador e nunca são enviadas para servidores externos.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="integrationId" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Integration ID
            </Label>
            <Input
              id="integrationId"
              placeholder="Seu Integration ID da Kommo"
              value={config.integrationId}
              onChange={(e) => setConfig({ ...config, integrationId: e.target.value })}
              className="bg-muted/50 border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Secret Key
            </Label>
            <Textarea
              id="secretKey"
              placeholder="Sua Secret Key da Kommo"
              value={config.secretKey}
              onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
              className="bg-muted/50 border-border min-h-[80px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirectUri" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Redirect URI
            </Label>
            <div className="flex gap-2">
              <Input
                id="redirectUri"
                placeholder="URI de redirecionamento OAuth"
                value={config.redirectUri}
                onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
                className="bg-muted/50 border-border"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={generateRedirectUri}
                className="whitespace-nowrap"
              >
                Gerar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountUrl" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              URL da Conta (opcional)
            </Label>
            <Input
              id="accountUrl"
              placeholder="https://sua-conta.kommo.com"
              value={config.accountUrl}
              onChange={(e) => setConfig({ ...config, accountUrl: e.target.value })}
              className="bg-muted/50 border-border"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:bg-primary-dark shadow-elegant"
            disabled={loading}
          >
            {loading ? (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Redirecionando para Kommo...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectar com Kommo
              </>
            )}
          </Button>
        </form>

        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2">Como obter suas credenciais:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Acesse sua conta Kommo como administrador</li>
            <li>Vá em Configurações → Integrações → Criar Integração</li>
            <li>Preencha as informações da sua integração</li>
            <li>Copie o Integration ID e Secret Key gerados</li>
            <li>Configure o Redirect URI em sua integração</li>
          </ol>
          
          {isGitHubPages() && (
            <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
              <h5 className="font-medium text-info mb-2">🚀 GitHub Pages Detectado</h5>
              <p className="text-sm text-muted-foreground">
                Detectamos que você está usando GitHub Pages. Use este Redirect URI em sua integração Kommo:
              </p>
              <code className="block mt-2 p-2 bg-muted text-xs rounded border font-mono">
                {getRedirectUri()}
              </code>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};