import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { ListItem } from "@/types/database.types";
import { useRouter } from "expo-router";

interface CreateShoppingSessionData {
  listId: string;
  storeName: string;
  items: ListItem[];
}

export function useCreateShoppingSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: CreateShoppingSessionData) => {
      if (!user?.id) {
        throw new Error("Benutzer nicht angemeldet");
      }

      console.log("useCreateShoppingSession: Erstelle Session mit Daten:", {
        userId: user.id,
        listId: data.listId,
        storeName: data.storeName,
        itemsCount: data.items.length,
      });

      // 1. Erstelle eine neue Einkaufssession
      const { data: session, error: sessionError } = await supabase
        .from("shopping_sessions")
        .insert([
          {
            user_id: user.id,
            list_id: data.listId,
            store_name: data.storeName,
            total_items: data.items.length,
          },
        ])
        .select()
        .single();

      if (sessionError) {
        console.error("Error creating shopping session:", sessionError);
        throw new Error("Fehler beim Erstellen der Einkaufssession");
      }

      console.log("useCreateShoppingSession: Session erstellt:", session);

      // 2. Füge die Items zur Session hinzu
      const sessionItems = data.items.map((item) => ({
        session_id: session.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit: item.unit,
      }));

      console.log(
        "useCreateShoppingSession: Füge Items zur Session hinzu:",
        sessionItems
      );

      const { error: itemsError } = await supabase
        .from("shopping_session_items")
        .insert(sessionItems);

      if (itemsError) {
        console.error("Error adding items to session:", itemsError);
        throw new Error("Fehler beim Hinzufügen der Items zur Einkaufssession");
      }

      console.log("useCreateShoppingSession: Items zur Session hinzugefügt");

      // 3. Lösche alle Items aus der Liste
      const { error: deleteError } = await supabase
        .from("list_items")
        .delete()
        .eq("list_id", data.listId);

      if (deleteError) {
        console.error("Error deleting list items:", deleteError);
        throw new Error("Fehler beim Löschen der Listenitems");
      }

      console.log("useCreateShoppingSession: Items aus Liste gelöscht");

      return session;
    },
    onSuccess: () => {
      // Invalidiere die Listen-Queries, um die UI zu aktualisieren
      console.log("useCreateShoppingSession: Invalidiere Queries");
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list"] });
      queryClient.invalidateQueries({ queryKey: ["userPopularItems"] });

      // Navigiere zurück zur Listenübersicht
      router.replace("/lists");
    },
  });
}
