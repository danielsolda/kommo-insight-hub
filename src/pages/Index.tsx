import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { KommoConfig } from "@/components/KommoConfig";
import { Dashboard } from "@/components/Dashboard";
import { useToast } from "@/hooks/use-toast";
import { KommoAuthService } from "@/services/kommoAuth";

const Index = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [kommoConfig, setKommoConfig] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se já existe configuração e tokens válidos
    const savedConfig = localStorage.getItem('kommoConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setKommoConfig(config);
      
      // Verificar se existem tokens válidos
      const authService = new KommoAuthService(config);
      const tokens = authService.loadTokens();
      
      if (tokens && authService.isTokenValid(tokens)) {
        setIsConfigured(true);
        toast({
          title: "Bem-vindo de volta!",
          description: "Sua sessão da Kommo ainda está ativa.",
        });
      }
    }
  }, [toast]);

  const handleConfigSave = (config: any) => {
    // Esta função agora é chamada apenas quando o OAuth é bem-sucedido
    setKommoConfig(config);
    setIsConfigured(true);
    toast({
      title: "Configuração salva!",
      description: "Sua integração com a Kommo foi configurada com sucesso.",
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
      description: "Você pode configurar uma nova integração.",
    });
  };

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
              Kommo Insight Hub
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
      <Dashboard config={kommoConfig} onReset={handleReset} />
    </div>
  );
};

export default Index;