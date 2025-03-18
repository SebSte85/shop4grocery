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

  // Get the deep link URL from Expo
  const redirectUrl = Linking.createURL("auth/callback", {
    scheme: "shop4grocery",
  });

  console.log("[useAuth] Configured redirect URL:", redirectUrl);

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
      router.replace("/(app)");
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

  const signInWithGoogle = async () => {
    console.log("[useAuth] signInWithGoogle called");
    console.log("[useAuth] redirectUrl:", redirectUrl);
    
    try {
      // Für Supabase-OAuth immer die Supabase-URL verwenden, nicht die lokale
      const finalRedirectUrl = "https://eskortwazxjmjzaqtotg.supabase.co/auth/v1/callback";
        
      console.log("[useAuth] Using redirect URL:", finalRedirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: finalRedirectUrl,
          // In Android & iOS use the native browser
          skipBrowserRedirect: true,
        },
      });

      console.log("[useAuth] signInWithGoogle result:", { data, error, url: data?.url });

      if (error) {
        console.error("[useAuth] OAuth error:", error);
        throw error;
      }
      
      if (!data?.url) {
        console.error("[useAuth] No URL returned from signInWithOAuth");
        throw new Error("Keine Anmelde-URL von Supabase erhalten");
      }

      // Öffne den Browser für die Anmeldung
      console.log("[useAuth] Opening browser with URL:", data.url);
      
      if (Platform.OS === "web") {
        // Im Web-Browser direkt navigieren
        window.location.href = data.url;
      } else {
        // In mobilen Apps WebBrowser verwenden
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );
        
        console.log("[useAuth] WebBrowser result:", result);
        
        if (result.type !== 'success') {
          throw new Error("Die Google-Anmeldung wurde abgebrochen");
        }
      }
      
      return data;
    } catch (error) {
      console.error("[useAuth] Exception in signInWithGoogle:", error);
      throw error;
    }
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
    signInWithGoogle,
    resetPassword,
  };
}
