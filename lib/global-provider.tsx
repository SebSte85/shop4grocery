import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";
import { AuthGuard } from "@/components/auth/AuthGuard";

const queryClient = new QueryClient();

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
