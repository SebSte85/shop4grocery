import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Hook zum Abrufen der Anzahl der getätigten Einkäufe pro Supermarkt
 * @param storeName Name des Supermarkts
 * @returns Anzahl der getätigten Einkäufe
 */
export function useStoreShoppingCount(storeName: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["storeShoppingCount", storeName, user?.id],
    queryFn: async () => {
      if (!user?.id || !storeName) return 0;

      const { count, error } = await supabase
        .from("shopping_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("store_name", storeName);

      if (error) {
        console.error("Error fetching store shopping count:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id && !!storeName,
  });
}
