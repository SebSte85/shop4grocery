import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Platform } from "react-native";

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

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    supabase,
  };
}
