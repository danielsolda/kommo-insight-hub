import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth, KommoCredentials } from "@/hooks/useAuth";
import { KommoAuthService } from "@/services/kommoAuth";
import { Loader2, RefreshCw, Trash2, Plus, Check, Edit2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { clearAllKommoCache, setStoredAccountId } from "@/utils/cacheManager";

interface KommoSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCredentialsUpdated?: () => void;
}

type ViewMode = "list" | "add" | "edit";

export const KommoSettings = ({ open, onOpenChange, onCredentialsUpdated }: KommoSettingsProps) => {
  const [accounts, setAccounts] = useState<KommoCredentials[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingAccount, setEditingAccount] = useState<KommoCredentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState<string | null>(null);
  
  // Form fields
  const [accountName, setAccountName] = useState("");
  const [integrationId, setIntegrationId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
  
  const { toast } = useToast();
  const { 
    loadAllKommoAccounts, 
    addKommoAccount, 
    updateKommoAccount, 
    deleteKommoAccount,
    setActiveAccount 
  } = useAuth();

  useEffect(() => {
    if (open) {
      loadAccounts();
    }
  }, [open]);

  const loadAccounts = async () => {
    try {
      const data = await loadAllKommoAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  };

  const resetForm = () => {
    setAccountName("");
    setIntegrationId("");
    setSecretKey("");
    setRedirectUri("");
    setAccountUrl("");
    setEditingAccount(null);
  };

  const handleAddClick = () => {
    resetForm();
    setViewMode("add");
  };

  const handleEditClick = (account: KommoCredentials) => {
    setEditingAccount(account);
    setAccountName(account.account_name);
    setIntegrationId(account.integration_id);
    setSecretKey(account.secret_key);
    setRedirectUri(account.redirect_uri || "");
    setAccountUrl(account.account_url || "");
    setViewMode("edit");
  };

  const handleCancel = () => {
    resetForm();
    setViewMode("list");
  };

  const handleSave = async () => {
    if (!accountName || !integrationId || !secretKey) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome da conta, Integration ID e Secret Key são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (viewMode === "add") {
        await addKommoAccount({
          account_name: accountName,
          integration_id: integrationId,
          secret_key: secretKey,
          redirect_uri: redirectUri || null,
          account_url: accountUrl || null,
        });
        toast({
          title: "Conta adicionada!",
          description: "Nova conta Kommo foi adicionada com sucesso."
        });
      } else if (viewMode === "edit" && editingAccount) {
        await updateKommoAccount(editingAccount.id, {
          account_name: accountName,
          integration_id: integrationId,
          secret_key: secretKey,
          redirect_uri: redirectUri || null,
          account_url: accountUrl || null,
        });
        toast({
          title: "Conta atualizada!",
          description: "As alterações foram salvas com sucesso."
        });
      }

      await loadAccounts();
      handleCancel();
    } catch (error: any) {
      console.error("Error saving account:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a conta.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (account: KommoCredentials) => {
    if (!confirm(`Tem certeza que deseja remover a conta "${account.account_name}"?`)) {
      return;
    }

    setLoading(true);

    try {
      await deleteKommoAccount(account.id);
      
      // Clear localStorage if deleting active account
      if (account.is_active) {
        localStorage.removeItem('kommoConfig');
        localStorage.removeItem('kommoTokens');
      }

      toast({
        title: "Conta removida",
        description: "A conta foi removida com sucesso."
      });

      await loadAccounts();
      
      // If deleted the active account, reload page
      if (account.is_active && onCredentialsUpdated) {
        onCredentialsUpdated();
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Erro ao remover",
        description: error.message || "Não foi possível remover a conta.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async (account: KommoCredentials) => {
    if (account.is_active) return;
    
    setSwitchingAccount(account.id);

    try {
      // Clear ALL Kommo cache before switching
      console.log('🔄 Switching account - clearing all cache...');
      clearAllKommoCache();
      
      await setActiveAccount(account.id);
      
      // Update localStorage with new account config
      const config = {
        integrationId: account.integration_id,
        secretKey: account.secret_key,
        redirectUri: account.redirect_uri || `${window.location.origin}/oauth/callback`,
        accountUrl: account.account_url || ""
      };
      localStorage.setItem('kommoConfig', JSON.stringify(config));
      
      // Store the new account ID for change detection
      const newAccountId = `${account.integration_id}-${account.account_url || 'default'}`;
      setStoredAccountId(newAccountId);
      
      if (account.access_token) {
        const tokens = {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.token_expires_at
        };
        localStorage.setItem('kommoTokens', JSON.stringify(tokens));
      } else {
        localStorage.removeItem('kommoTokens');
      }

      toast({
        title: "Conta alterada!",
        description: `Trocando para "${account.account_name}"...`
      });

      // Reload page to apply new account with clean state
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error: any) {
      console.error("Error switching account:", error);
      toast({
        title: "Erro ao trocar conta",
        description: error.message || "Não foi possível trocar de conta.",
        variant: "destructive"
      });
      setSwitchingAccount(null);
    }
  };

  const handleReconnectOAuth = (account: KommoCredentials) => {
    if (!account.integration_id || !account.secret_key) {
      toast({
        title: "Configuração incompleta",
        description: "Complete as credenciais da conta antes de reconectar.",
        variant: "destructive"
      });
      return;
    }

    const config = {
      integrationId: account.integration_id,
      secretKey: account.secret_key,
      redirectUri: account.redirect_uri || `${window.location.origin}/oauth/callback`,
      accountUrl: account.account_url || ""
    };

    localStorage.setItem('kommoConfig', JSON.stringify(config));
    localStorage.setItem('kommoReconnectAccountId', account.id);

    const authService = new KommoAuthService(config);
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('kommoOAuthState', state);
    
    const authUrl = authService.generateAuthUrl(state);
    window.location.href = authUrl;
  };

  const renderAccountsList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Suas Contas</h3>
        <Button size="sm" onClick={handleAddClick} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma conta configurada. Clique em "Adicionar" para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id} className={`${account.is_active ? 'border-primary' : 'border-border'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.account_name}</span>
                      {account.is_active && (
                        <Badge variant="default" className="text-xs">Ativa</Badge>
                      )}
                      {account.access_token ? (
                        <Badge variant="outline" className="text-xs text-green-600">Conectada</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-yellow-600">OAuth Pendente</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {account.account_url || "URL não configurada"}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!account.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSwitchAccount(account)}
                        disabled={switchingAccount === account.id || loading}
                        className="flex items-center gap-1"
                      >
                        {switchingAccount === account.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Usar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReconnectOAuth(account)}
                      disabled={loading}
                      title="Reconectar OAuth"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(account)}
                      disabled={loading}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account)}
                      disabled={loading || accounts.length === 1}
                      title={accounts.length === 1 ? "Não é possível remover a única conta" : "Remover conta"}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {viewMode === "add" ? "Nova Conta" : "Editar Conta"}
        </h3>
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accountName">Nome da Conta *</Label>
          <Input
            id="accountName"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Ex: Empresa Principal, Cliente XYZ"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="integrationId">Integration ID *</Label>
          <Input
            id="integrationId"
            value={integrationId}
            onChange={(e) => setIntegrationId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            disabled={loading}
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
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="redirectUri">Redirect URI</Label>
          <Input
            id="redirectUri"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            placeholder={`${window.location.origin}/oauth/callback`}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountUrl">Account URL</Label>
          <Input
            id="accountUrl"
            value={accountUrl}
            onChange={(e) => setAccountUrl(e.target.value)}
            placeholder="https://seudominio.kommo.com"
            disabled={loading}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              viewMode === "add" ? "Adicionar Conta" : "Salvar Alterações"
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações da Kommo</DialogTitle>
          <DialogDescription>
            Gerencie suas contas de integração com a Kommo CRM
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <Alert className="mb-4">
          <AlertDescription>
            Você pode gerenciar múltiplas contas Kommo e alternar entre elas rapidamente.
          </AlertDescription>
        </Alert>

        {viewMode === "list" ? renderAccountsList() : renderForm()}
      </DialogContent>
    </Dialog>
  );
};
