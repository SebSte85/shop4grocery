import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";

export default function AuthLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/(app)");
    }
  }, [user, loading]);

  if (loading) {
    return null; // Oder einen Loading-Screen anzeigen
  }

  return (
    <Stack>
      <Stack.Screen
        name="login"
        options={{
          title: "Anmelden",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Registrieren",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Passwort vergessen",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
