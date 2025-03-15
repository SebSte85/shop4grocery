import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, loading]);

  if (loading) {
    return null; // Oder einen Loading-Screen anzeigen
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="lists/new"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="lists/[id]/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="lists/[id]/add-items"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
