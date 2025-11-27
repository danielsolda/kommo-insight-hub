import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface KommoCredentials {
  integration_id: string;
  secret_key: string;
  redirect_uri: string | null;
  account_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
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

  const loadKommoCredentials = useCallback(async (): Promise<KommoCredentials | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_kommo_credentials")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading credentials:", error);
      return null;
    }

    return data;
  }, [user]);

  const saveKommoCredentials = useCallback(async (credentials: Partial<KommoCredentials>) => {
    if (!user) throw new Error("User not authenticated");

    const { data: existing } = await supabase
      .from("user_kommo_credentials")
      .select("id")
      .eq("user_id", user.id)
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
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

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
          token_expires_at: credentials.token_expires_at || null
        });

      if (error) throw error;
    }
  }, [user]);

  const deleteKommoCredentials = useCallback(async () => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("user_kommo_credentials")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;
  }, [user]);

  return {
    user,
    session,
    loading,
    signOut,
    loadKommoCredentials,
    saveKommoCredentials,
    deleteKommoCredentials
  };
};
