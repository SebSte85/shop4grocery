import React, { ReactNode, useEffect } from "react";
import { useAuthContext } from "@/lib/auth-provider";
import { useRouter, useSegments } from "expo-router";

/**
 * AuthGuard component that protects routes requiring authentication
 * Redirects to login if user is not authenticated
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Redirect to login if user is not authenticated and not in auth group
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Redirect to app if user is authenticated and in auth group
      router.replace("/(app)/lists");
    }
  }, [user, loading, segments, router]);

  // Show nothing while checking authentication
  if (loading) {
    return null;
  }

  return <>{children}</>;
}
