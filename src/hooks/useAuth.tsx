import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface KommoCredentials {
  id: string;
  integration_id: string;
  secret_key: string;
  redirect_uri: string | null;
  account_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  account_name: string;
  is_active: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  // Load all Kommo accounts for current user
  const loadAllKommoAccounts = useCallback(async (): Promise<KommoCredentials[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("user_kommo_credentials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading Kommo accounts:", error);
      return [];
    }

    return data || [];
  }, [user]);

  // Load only the active Kommo account
  const loadActiveKommoAccount = useCallback(async (): Promise<KommoCredentials | null> => {
    if (!user) return null;

    // First try to get active account
    const { data: activeAccount, error: activeError } = await supabase
      .from("user_kommo_credentials")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (activeError) {
      console.error("Error loading active account:", activeError);
      return null;
    }

    if (activeAccount) return activeAccount;

    // If no active account, get the first one and set it as active
    const { data: firstAccount, error: firstError } = await supabase
      .from("user_kommo_credentials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstError || !firstAccount) {
      return null;
    }

    // Set first account as active
    await supabase
      .from("user_kommo_credentials")
      .update({ is_active: true })
      .eq("id", firstAccount.id);

    return { ...firstAccount, is_active: true };
  }, [user]);

  // Set a specific account as active (deactivates others)
  const setActiveAccount = useCallback(async (accountId: string) => {
    if (!user) throw new Error("User not authenticated");

    // Deactivate all accounts
    await supabase
      .from("user_kommo_credentials")
      .update({ is_active: false })
      .eq("user_id", user.id);

    // Activate the selected account
    const { error } = await supabase
      .from("user_kommo_credentials")
      .update({ is_active: true })
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (error) throw error;
  }, [user]);

  // Add a new Kommo account
  const addKommoAccount = useCallback(async (credentials: {
    integration_id: string;
    secret_key: string;
    redirect_uri?: string | null;
    account_url?: string | null;
    account_name: string;
    access_token?: string | null;
    refresh_token?: string | null;
    token_expires_at?: string | null;
  }) => {
    if (!user) throw new Error("User not authenticated");

    const { data: existingAccounts } = await supabase
      .from("user_kommo_credentials")
      .select("id")
      .eq("user_id", user.id);

    const isFirstAccount = !existingAccounts || existingAccounts.length === 0;

    const { error } = await supabase
      .from("user_kommo_credentials")
      .insert({
        user_id: user.id,
        integration_id: credentials.integration_id,
        secret_key: credentials.secret_key,
        redirect_uri: credentials.redirect_uri || null,
        account_url: credentials.account_url || null,
        account_name: credentials.account_name,
        access_token: credentials.access_token || null,
        refresh_token: credentials.refresh_token || null,
        token_expires_at: credentials.token_expires_at || null,
        is_active: isFirstAccount,
      });

    if (error) throw error;
  }, [user]);

  // Update an existing Kommo account
  const updateKommoAccount = useCallback(async (accountId: string, credentials: Partial<KommoCredentials>) => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("user_kommo_credentials")
      .update({
        ...credentials,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (error) throw error;
  }, [user]);

  // Delete a Kommo account
  const deleteKommoAccount = useCallback(async (accountId: string) => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("user_kommo_credentials")
      .delete()
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (error) throw error;
  }, [user]);

  // Legacy function - now uses active account
  const loadKommoCredentials = loadActiveKommoAccount;
  
  const saveKommoCredentials = useCallback(async (credentials: Partial<KommoCredentials>) => {
    if (!user) throw new Error("User not authenticated");

    const { data: existing } = await supabase
      .from("user_kommo_credentials")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("user_kommo_credentials")
        .update({
          integration_id: credentials.integration_id,
          secret_key: credentials.secret_key,
          redirect_uri: credentials.redirect_uri,
          account_url: credentials.account_url,
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
          token_expires_at: credentials.token_expires_at,
          account_name: credentials.account_name || existing.account_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      if (!credentials.integration_id || !credentials.secret_key) {
        throw new Error("integration_id and secret_key are required");
      }

      const { error } = await supabase
        .from("user_kommo_credentials")
        .insert({
          user_id: user.id,
          integration_id: credentials.integration_id,
          secret_key: credentials.secret_key,
          redirect_uri: credentials.redirect_uri || null,
          account_url: credentials.account_url || null,
          access_token: credentials.access_token || null,
          refresh_token: credentials.refresh_token || null,
          token_expires_at: credentials.token_expires_at || null,
          account_name: credentials.account_name || 'Conta Principal',
          is_active: true,
        });

      if (error) throw error;
    }
  }, [user]);

  const deleteKommoCredentials = useCallback(async () => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("user_kommo_credentials")
      .delete()
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (error) throw error;
  }, [user]);

  return {
    user,
    session,
    loading,
    signOut,
    // Multi-account functions
    loadAllKommoAccounts,
    loadActiveKommoAccount,
    setActiveAccount,
    addKommoAccount,
    updateKommoAccount,
    deleteKommoAccount,
    // Legacy functions
    loadKommoCredentials,
    saveKommoCredentials,
    deleteKommoCredentials,
  };
};
