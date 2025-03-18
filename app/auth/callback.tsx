import { useEffect } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";

export default function Callback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[Callback] Entered callback screen with params:", params);
        // Der Token kommt als URL-Parameter und muss an Supabase übergeben werden
        const {
          access_token,
          refresh_token,
          code,
          error,
          error_description,
          type,
          state,
          provider,
        } = params;

        // Überprüfe auf Fehler
        if (error) {
          console.error(
            `[Callback] OAuth error: ${error}, ${error_description}`
          );
          router.replace({
            pathname: "/(auth)/login",
            params: { error: error_description || "Authentication failed" },
          });
          return;
        }

        // Für Code Grant Flow
        if (code) {
          console.log("[Callback] Processing authorization code");
          const { error: sessionError } =
            await supabase.auth.exchangeCodeForSession(code as string);

          if (sessionError) {
            console.error(
              "[Callback] Error exchanging code for session:",
              sessionError
            );
            router.replace("/(auth)/login");
            return;
          }
        }
        // Für Impliziten Flow (veraltet, aber als Fallback)
        else if (access_token) {
          console.log("[Callback] Processing access token");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string,
          });

          if (sessionError) {
            console.error("[Callback] Error setting session:", sessionError);
            router.replace("/(auth)/login");
            return;
          }
        }

        console.log("[Callback] Authentication successful, redirecting to app");
        // Erfolgreiche Anmeldung, leite zur App weiter
        router.replace("/(app)");
      } catch (error) {
        console.error("[Callback] Error during OAuth callback:", error);
        router.replace("/(auth)/login");
      }
    };

    handleCallback();
  }, [params, router]);

  return (
    <View className="flex-1 bg-black-1 justify-center items-center">
      <ActivityIndicator size="large" color="#8b5cf6" />
      <Text className="text-white font-rubik mt-4">
        Anmeldung wird verarbeitet...
      </Text>
    </View>
  );
}
