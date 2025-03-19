import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const params = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    console.log("[AuthCallback] Received params:", params);

    // Prüfe, ob alle benötigten Parameter vorhanden sind
    if (!params.access_token && !params.refresh_token && !params.code) {
      console.error("[AuthCallback] Missing required parameters");
      // Nach 2 Sekunden zur Login-Seite zurückkehren
      const timer = setTimeout(() => {
        router.replace("/(auth)/login");
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Stellt sicher, dass die Supabase-Sitzung aktualisiert wird
    if (params.access_token || params.refresh_token) {
      console.log("[AuthCallback] Setting session from tokens");

      const session = {
        access_token: params.access_token as string,
        refresh_token: params.refresh_token as string,
      };

      void supabase.auth.setSession(session);
    }

    // Wenn ein Code vorhanden ist, kann die exchangeCodeForSession-Methode verwendet werden
    if (params.code) {
      console.log("[AuthCallback] Exchanging code for session");
      void supabase.auth.exchangeCodeForSession(params.code as string);
    }

    // Nach kurzer Verzögerung zur Hauptseite weiterleiten
    const timer = setTimeout(() => {
      router.replace("/(app)/lists");
    }, 1000);

    return () => clearTimeout(timer);
  }, [params, router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#011A38",
      }}
    >
      <ActivityIndicator size="large" color="#B23FFF" />
      <Text
        style={{ marginTop: 20, color: "white", fontFamily: "Rubik-Medium" }}
      >
        Anmeldung abschließen...
      </Text>
    </View>
  );
}
