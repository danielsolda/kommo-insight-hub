import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { KommoAuthService } from "@/services/kommoAuth";
import { useToast } from "@/hooks/use-toast";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autorização...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');
        const referer = searchParams.get('referer'); // Ex: "danielsolda.kommo.com"

        if (error) {
          throw new Error(`Autorização negada: ${error}`);
        }

        if (!code) {
          throw new Error('Código de autorização não encontrado');
        }

        // Carregar configuração salva
        const savedConfig = localStorage.getItem('kommoConfig');
        if (!savedConfig) {
          throw new Error('Configuração da Kommo não encontrada');
        }

        let config = JSON.parse(savedConfig);

        // Se temos o referer da Kommo, atualizar/definir a account URL
        if (referer) {
          const normalizedAccountUrl = referer.startsWith('http') 
            ? referer 
            : `https://${referer}`;
          
          config.accountUrl = normalizedAccountUrl;
          localStorage.setItem('kommoConfig', JSON.stringify(config));
          
          console.log('Updated account URL from referer:', normalizedAccountUrl);
        }

        const authService = new KommoAuthService(config);

        setMessage('Trocando código por tokens...');

        // Trocar código por tokens
        const tokens = await authService.exchangeCodeForTokens(code);
        
        // Salvar tokens
        authService.saveTokens(tokens);

        setStatus('success');
        setMessage('Autorização concluída com sucesso!');

        toast({
          title: "Autorização bem-sucedida!",
          description: "Sua conta Kommo foi conectada com sucesso.",
        });

        // Redirecionar para o dashboard após 2 segundos
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);

      } catch (error) {
        console.error('OAuth Callback Error:', error);
        setStatus('error');
        
        // Melhorar mensagem de erro baseado no tipo
        let errorMessage = 'Erro desconhecido';
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Se for erro da API, tentar extrair mais detalhes
          if (error.message.includes('Falha ao trocar código por tokens')) {
            errorMessage = 'Erro na autenticação com a Kommo. Verifique suas credenciais e URL da conta.';
          }
        }
        
        setMessage(errorMessage);
        
        toast({
          title: "Erro na autorização",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gradient-card border-border/50 shadow-elegant">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            {status === 'loading' && (
              <div className="p-3 rounded-lg bg-gradient-primary shadow-glow">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="p-3 rounded-lg bg-success/20">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            )}
            {status === 'error' && (
              <div className="p-3 rounded-lg bg-destructive/20">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-xl">
            {status === 'loading' && 'Processando...'}
            {status === 'success' && 'Autorização Concluída!'}
            {status === 'error' && 'Erro na Autorização'}
          </CardTitle>
          
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Redirecionando para o dashboard...
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-gradient-primary h-2 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallback;