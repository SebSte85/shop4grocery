import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useSubscription } from "./useSubscription";

// Get Supabase URL from environment or config
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Dynamische URL-Bestimmung - für Entwicklung oder Produktion
  const isDevelopment = __DEV__;
  
  // In der Entwicklung die lokale URL verwenden, in Produktion Deep-Link-Schema
  const redirectUrl = isDevelopment 
    ? "exp://192.168.178.97:8081/--/auth/callback"
    : "korbklick://auth/callback";

  // In der mobilen App die URL-Schema registrieren
  useEffect(() => {
    // Expo-Linking-URL ausgeben zur Prüfung
    const url = Linking.createURL('/auth/callback');
  }, []);

  // Füge URL-Listener für Deep Links hinzu
  useEffect(() => {
    // Diese Funktion wird aufgerufen, wenn ein Deep Link die App öffnet
    const handleDeepLink = (event: { url: string }) => {
      // Hier können Parameter aus der URL extrahiert werden, falls notwendig
      // Beispiel: const url = new URL(event.url);
    };

    // URL-Listener registrieren
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Initial-URL überprüfen (falls App durch einen Deep Link gestartet wurde)
    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) throw error;
    if (data.session) {
      // Richtige Weiterleitung zur Listen-Seite im App-Bereich
      router.replace("/(app)/lists");
    }
  };

  const signUp = async (email: string, password: string, fullName: string = "") => {
    // Normalisiere die E-Mail-Adresse
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        // Spezielle Fehlerbehandlung für E-Mail-Validierung
        if (error.message.includes("invalid")) {
          throw new Error(
            "Diese E-Mail-Adresse kann nicht verwendet werden. Bitte versuchen Sie eine andere E-Mail-Adresse."
          );
        }
        throw error;
      }

      // Prüfe den Status der Registrierung
      if (data?.user?.identities?.length === 0) {
        throw new Error(
          "Diese E-Mail-Adresse wird bereits verwendet. Bitte melden Sie sich an oder nutzen Sie die Passwort-Vergessen-Funktion."
        );
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.replace("/(auth)/login");
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: redirectUrl,
      }
    );

    if (error) throw error;
  };

  const deleteAccount = async (password: string, cancelSubscriptionFn?: (cancelImmediately: boolean) => Promise<any>) => {
    try {
      // First verify the user's password before allowing account deletion
      if (!user?.email) {
        throw new Error("Nicht angemeldet");
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        throw new Error("Falsches Passwort. Bitte versuche es erneut.");
      }

      // If the cancelSubscription function was passed and the user has a subscription,
      // cancel it first
      if (cancelSubscriptionFn) {
        try {
          // Cancel at period end (false) rather than immediately (true)
          await cancelSubscriptionFn(false);
          console.log("Subscription cancelled at period end");
        } catch (error) {
          console.error("Error cancelling subscription:", error);
          // We'll continue with account deletion even if subscription cancellation fails
        }
      }

      // Try to delete user data using the Edge Function
      try {
        // Get current session for auth
        const { data: authData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !authData.session) {
          console.error('Session error:', sessionError);
          throw new Error('Not authenticated');
        }

        // Call the Edge Function to delete the account
        const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.session.access_token}`,
          },
          body: JSON.stringify({ 
            userId: user.id
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Account deletion failed:', errorData);
          throw new Error(errorData.error || 'Failed to delete account');
        }

        // Account was successfully deleted server-side
        console.log("Account successfully deleted");
      } catch (deleteError) {
        console.error("Error deleting account:", deleteError);
        throw new Error("Fehler beim Löschen des Kontos. Bitte versuche es später erneut.");
      }
      
      // Sign out the user and explicitly redirect to login screen
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Error signing out:", signOutError);
      }
      
      // For a better user experience, we'll redirect to login anyway
      router.replace("/(auth)/login");
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    deleteAccount,
    supabase,
  };
}
