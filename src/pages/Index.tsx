import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Settings, Users, TrendingUp, DollarSign, Target } from "lucide-react";
import { KommoConfig } from "@/components/KommoConfig";
import { Dashboard } from "@/components/Dashboard";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [kommoConfig, setKommoConfig] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se já existe configuração salva
    const savedConfig = localStorage.getItem('kommoConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setKommoConfig(config);
      setIsConfigured(true);
    }
  }, []);

  const handleConfigSave = (config: any) => {
    setKommoConfig(config);
    setIsConfigured(true);
    localStorage.setItem('kommoConfig', JSON.stringify(config));
    toast({
      title: "Configuração salva!",
      description: "Sua integração com a Kommo foi configurada com sucesso.",
    });
  };

  const handleReset = () => {
    setIsConfigured(false);
    setKommoConfig(null);
    localStorage.removeItem('kommoConfig');
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
          <div className="text-center mb-12">
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

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardHeader>
                <Target className="h-8 w-8 text-primary-glow mb-2" />
                <CardTitle>Pipelines</CardTitle>
                <CardDescription>
                  Acompanhe o progresso dos seus pipelines de vendas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardHeader>
                <Users className="h-8 w-8 text-primary-glow mb-2" />
                <CardTitle>Leads</CardTitle>
                <CardDescription>
                  Gerencie e analise seus leads de forma inteligente
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-card border-border/50 shadow-card">
              <CardHeader>
                <DollarSign className="h-8 w-8 text-primary-glow mb-2" />
                <CardTitle>Vendas</CardTitle>
                <CardDescription>
                  Monitore suas vendas e receitas em tempo real
                </CardDescription>
              </CardHeader>
            </Card>
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