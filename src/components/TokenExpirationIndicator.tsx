import { useState, useEffect, useCallback } from "react";
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KommoAuthService, KommoTokens } from "@/services/kommoAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TokenExpirationIndicatorProps {
  onSessionExpired: () => void;
}

export const TokenExpirationIndicator = ({ onSessionExpired }: TokenExpirationIndicatorProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const getTokens = useCallback((): KommoTokens | null => {
    const saved = localStorage.getItem('kommoTokens');
    return saved ? JSON.parse(saved) : null;
  }, []);

  const getConfig = useCallback(() => {
    const saved = localStorage.getItem('kommoConfig');
    return saved ? JSON.parse(saved) : null;
  }, []);

  const refreshToken = useCallback(async () => {
    const tokens = getTokens();
    const config = getConfig();
    
    if (!tokens || !config) return false;
    
    setIsRefreshing(true);
    try {
      const authService = new KommoAuthService(config);
      const newTokens = await authService.refreshAccessToken(tokens.refreshToken);
      
      // Save to localStorage
      localStorage.setItem('kommoTokens', JSON.stringify(newTokens));
      
      // Update in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("user_kommo_credentials")
          .update({
            access_token: newTokens.accessToken,
            refresh_token: newTokens.refreshToken,
            token_expires_at: new Date(newTokens.expiresAt).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("is_active", true);
      }
      
      toast({
        title: "Token renovado!",
        description: "Sua sessão foi renovada com sucesso.",
      });
      
      return true;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      toast({
        title: "Falha ao renovar token",
        description: "Sua sessão expirou. Você será redirecionado para reconectar.",
        variant: "destructive",
      });
      
      // Wait a moment for user to see the message, then trigger logout
      setTimeout(() => {
        onSessionExpired();
      }, 2000);
      
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [getTokens, getConfig, toast, onSessionExpired]);

  useEffect(() => {
    const updateTimeRemaining = () => {
      const tokens = getTokens();
      if (!tokens?.expiresAt) {
        setTimeRemaining(null);
        return;
      }

      const remaining = tokens.expiresAt - Date.now();
      setTimeRemaining(remaining);

      // Auto-refresh when less than 5 minutes remaining
      if (remaining > 0 && remaining < 5 * 60 * 1000) {
        refreshToken();
      }
      
      // Session expired - trigger logout
      if (remaining <= 0) {
        toast({
          title: "Sessão expirada",
          description: "Sua sessão expirou. Tentando renovar automaticamente...",
          variant: "destructive",
        });
        refreshToken();
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [getTokens, refreshToken, toast]);

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "Expirado";
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  };

  const getStatus = () => {
    if (!timeRemaining || timeRemaining <= 0) {
      return { color: "destructive" as const, icon: AlertTriangle, label: "Expirado" };
    }
    if (timeRemaining < 30 * 60 * 1000) { // Less than 30 minutes
      return { color: "destructive" as const, icon: AlertTriangle, label: "Expirando" };
    }
    if (timeRemaining < 2 * 60 * 60 * 1000) { // Less than 2 hours
      return { color: "secondary" as const, icon: Clock, label: "Atenção" };
    }
    return { color: "outline" as const, icon: CheckCircle, label: "OK" };
  };

  if (timeRemaining === null) return null;

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Badge 
              variant={status.color} 
              className="flex items-center gap-1 cursor-pointer text-xs"
            >
              {isRefreshing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <StatusIcon className="h-3 w-3" />
              )}
              {formatTimeRemaining(timeRemaining)}
            </Badge>
            {timeRemaining < 30 * 60 * 1000 && !isRefreshing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  refreshToken();
                }}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">Token de acesso Kommo</p>
            <p className="text-muted-foreground">
              {timeRemaining > 0 
                ? `Expira em ${formatTimeRemaining(timeRemaining)}` 
                : "Token expirado"}
            </p>
            {timeRemaining > 0 && timeRemaining < 30 * 60 * 1000 && (
              <p className="text-warning text-xs mt-1">
                Clique para renovar manualmente
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
