import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Loader2 } from "lucide-react";
import { KommoConfig } from "@/components/KommoConfig";
import { Dashboard } from "@/components/Dashboard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { KommoAuthService } from "@/services/kommoAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [kommoConfig, setKommoConfig] = useState<any>(null);
  const [activeAccountName, setActiveAccountName] = useState<string>("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const hasInitialized = useRef(false);
  const { user, loading: authLoading, loadActiveKommoAccount } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Prevent running multiple times
    if (hasInitialized.current) return;
    if (authLoading) return;

    const initializeAuth = async () => {
      // If not authenticated, redirect to auth page
      if (!user) {
        navigate("/auth");
        return;
      }

      hasInitialized.current = true;

      // User is authenticated, load active Kommo account from database
      try {
        const credentials = await loadActiveKommoAccount();
        
        if (credentials) {
          // Has credentials in database
          const config = {
            integrationId: credentials.integration_id,
            secretKey: credentials.secret_key,
            redirectUri: credentials.redirect_uri || `${window.location.origin}/oauth/callback`,
            accountUrl: credentials.account_url || ""
          };

          setKommoConfig(config);
          setActiveAccountName(credentials.account_name || 'Conta Principal');

          if (credentials.access_token && credentials.refresh_token) {
            let tokens = {
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token,
              expiresIn: 0,
              tokenType: "Bearer",
              expiresAt: new Date(credentials.token_expires_at || 0).getTime()
            };

            const authService = new KommoAuthService(config);
            
            // If token expired, try to refresh it automatically
            if (!authService.isTokenValid(tokens)) {
              console.log("Token expired, attempting refresh...");
              try {
                const newTokens = await authService.refreshAccessToken(tokens.refreshToken);
                tokens = newTokens;
                
                // Update tokens in database
                await supabase
                  .from("user_kommo_credentials")
                  .update({
                    access_token: newTokens.accessToken,
                    refresh_token: newTokens.refreshToken,
                    token_expires_at: new Date(newTokens.expiresAt).toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", credentials.id);
                  
                console.log("Token refreshed successfully");
              } catch (refreshError) {
                console.error("Failed to refresh token:", refreshError);
                // Token refresh failed, user needs to re-authenticate
                setCheckingAuth(false);
                return;
              }
            }

            // Save tokens to localStorage for KommoAuthService
            localStorage.setItem('kommoTokens', JSON.stringify(tokens));
            localStorage.setItem('kommoConfig', JSON.stringify(config));

            setIsConfigured(true);
            toast({
              title: "Bem-vindo de volta!",
              description: `Conectado à conta "${credentials.account_name || 'Conta Principal'}".`
            });
          }
        }
      } catch (error) {
        console.error("Error loading credentials:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    initializeAuth();
  }, [user, authLoading, loadActiveKommoAccount, navigate, toast]);
  const handleConfigSave = (config: any) => {
    // Esta função agora é chamada apenas quando o OAuth é bem-sucedido
    setKommoConfig(config);
    setIsConfigured(true);
    toast({
      title: "Configuração salva!",
      description: "Sua integração com a Kommo foi configurada com sucesso."
    });
  };
  const handleReset = () => {
    setIsConfigured(false);
    setKommoConfig(null);
    localStorage.removeItem('kommoConfig');
    localStorage.removeItem('kommoTokens');
    localStorage.removeItem('kommoOAuthState');
    toast({
      title: "Configuração resetada",
      description: "Você pode configurar uma nova integração."
    });
  };
  // Show loading while checking auth
  if (authLoading || checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show config if not configured yet
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-xl bg-gradient-primary shadow-glow">
                <BarChart3 className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-glow to-primary bg-clip-text text-transparent">
              AutomatiZe Hub
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Dashboard de análise completo para seus pipelines, leads e vendas da Kommo CRM. 
              Visualize suas métricas e tome decisões baseadas em dados.
            </p>
          </div>

          {/* Configuration */}
          <KommoConfig onSave={handleConfigSave} />
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Dashboard config={kommoConfig} onReset={handleReset} activeAccountName={activeAccountName} />
    </div>
  );
};
export default Index;