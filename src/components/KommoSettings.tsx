import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { KommoAuthService } from "@/services/kommoAuth";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface KommoSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCredentialsUpdated?: () => void;
}

export const KommoSettings = ({ open, onOpenChange, onCredentialsUpdated }: KommoSettingsProps) => {
  const [integrationId, setIntegrationId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { loadKommoCredentials, saveKommoCredentials, deleteKommoCredentials } = useAuth();

  useEffect(() => {
    if (open) {
      loadCredentials();
    }
  }, [open]);

  const loadCredentials = async () => {
    try {
      const credentials = await loadKommoCredentials();
      if (credentials) {
        setIntegrationId(credentials.integration_id);
        setSecretKey(credentials.secret_key);
        setRedirectUri(credentials.redirect_uri || "");
        setAccountUrl(credentials.account_url || "");
      }
    } catch (error) {
      console.error("Error loading credentials:", error);
    }
  };

  const handleSave = async () => {
    if (!integrationId || !secretKey) {
      toast({
        title: "Campos obrigatórios",
        description: "Integration ID e Secret Key são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await saveKommoCredentials({
        integration_id: integrationId,
        secret_key: secretKey,
        redirect_uri: redirectUri || null,
        account_url: accountUrl || null
      });

      toast({
        title: "Credenciais atualizadas!",
        description: "Suas configurações foram salvas com sucesso."
      });

      if (onCredentialsUpdated) {
        onCredentialsUpdated();
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving credentials:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as credenciais.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = () => {
    if (!integrationId || !secretKey) {
      toast({
        title: "Configuração incompleta",
        description: "Salve as credenciais antes de reconectar.",
        variant: "destructive"
      });
      return;
    }

    const config = {
      integrationId,
      secretKey,
      redirectUri: redirectUri || `${window.location.origin}/oauth/callback`,
      accountUrl: accountUrl || ""
    };

    // Save to localStorage temporarily for OAuth flow
    localStorage.setItem('kommoConfig', JSON.stringify(config));

    const authService = new KommoAuthService(config);
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('kommoOAuthState', state);
    
    const authUrl = authService.generateAuthUrl(state);
    window.location.href = authUrl;
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja remover suas credenciais da Kommo? Você precisará configurar tudo novamente.")) {
      return;
    }

    setDeleting(true);

    try {
      await deleteKommoCredentials();
      
      // Clear localStorage
      localStorage.removeItem('kommoConfig');
      localStorage.removeItem('kommoTokens');
      localStorage.removeItem('kommoOAuthState');

      toast({
        title: "Credenciais removidas",
        description: "Você precisará configurar a integração novamente."
      });

      if (onCredentialsUpdated) {
        onCredentialsUpdated();
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting credentials:", error);
      toast({
        title: "Erro ao remover",
        description: error.message || "Não foi possível remover as credenciais.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações da Kommo</DialogTitle>
          <DialogDescription>
            Ajuste suas credenciais de integração com a Kommo CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertDescription>
              Suas credenciais são armazenadas de forma segura no banco de dados e criptografadas em trânsito.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="integrationId">Integration ID *</Label>
            <Input
              id="integrationId"
              value={integrationId}
              onChange={(e) => setIntegrationId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              disabled={loading || deleting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey">Secret Key *</Label>
            <Input
              id="secretKey"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="••••••••••••••••"
              disabled={loading || deleting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirectUri">Redirect URI</Label>
            <Input
              id="redirectUri"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder={`${window.location.origin}/oauth/callback`}
              disabled={loading || deleting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountUrl">Account URL</Label>
            <Input
              id="accountUrl"
              value={accountUrl}
              onChange={(e) => setAccountUrl(e.target.value)}
              placeholder="https://seudominio.kommo.com"
              disabled={loading || deleting}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading || deleting} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={handleReconnect}
              disabled={loading || deleting}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reconectar OAuth
            </Button>

            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading || deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
