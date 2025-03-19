import { Redirect } from "expo-router";
import { useAuthContext } from "@/lib/auth-provider";
import { SplashScreen } from "@/components/SplashScreen";

export default function Index() {
  const { user, loading } = useAuthContext();

  // Show splash screen while checking authentication
  if (loading) {
    return <SplashScreen />;
  }

  // Redirect to login if not authenticated, otherwise to app
  return user ? (
    <Redirect href="/(app)/lists" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}
