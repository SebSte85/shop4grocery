import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

// Create the auth context
type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuthContext() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}
