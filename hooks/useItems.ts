import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Item } from "@/types/database.types";
import { useAuth } from "./useAuth";

// Hook zum Abrufen der häufigsten Items des Benutzers aus abgeschlossenen Einkaufssessions
export function useUserPopularItems(limit: number = 20) {
  const { user } = useAuth();

  return useQuery<Item[], Error>({
    queryKey: ["userPopularItems"],
    queryFn: async () => {
      try {
        if (!user?.id) {
          console.log("useUserPopularItems: Kein Benutzer angemeldet");
          return [];
        }

        console.log("useUserPopularItems: Rufe Daten für Benutzer ab", user.id);

        // Abfrage, um die häufigsten Items aus den Einkaufssessions des Benutzers zu erhalten
        const { data, error } = await supabase.rpc("get_user_popular_items", {
          user_id_param: user.id,
          limit_param: limit,
        });

        if (error) {
          console.error("Error fetching user popular items:", error);
          throw error;
        }

        console.log("useUserPopularItems: Erhaltene Daten:", data);
        console.log(
          "useUserPopularItems: Anzahl der Items:",
          data?.length || 0
        );

        return data || [];
      } catch (err) {
        console.error("Error in useUserPopularItems:", err);
        throw err;
      }
    },
    enabled: !!user?.id,
  });
}

export function useItems(searchText?: string) {
  const { user } = useAuth();
  const { data: userPopularItems = [], isLoading: isLoadingUserItems } =
    useUserPopularItems();

  return useQuery<Item[], Error>({
    queryKey: ["items", searchText],
    queryFn: async () => {
      try {
        console.log("useItems: Suchtext:", searchText);

        // Wenn es einen Suchtext gibt, suchen wir in der Datenbank
        if (searchText?.trim()) {
          console.log("useItems: Suche nach Items mit Suchtext");

          const { data, error } = await supabase
            .from("items")
            .select("*")
            .ilike("name", `%${searchText.trim()}%`)
            .order("name");

          if (error) throw error;

          console.log(
            "useItems: Gefundene Items mit Suchtext:",
            data?.length || 0
          );
          return data || [];
        }

        // Wenn der Benutzer bereits Einkäufe getätigt hat, zeigen wir seine häufigsten Items
        console.log(
          "useItems: Benutzer-Items verfügbar:",
          userPopularItems.length > 0
        );
        if (userPopularItems.length > 0) {
          console.log("useItems: Verwende Benutzer-Items:", userPopularItems);
          return userPopularItems;
        }

        // Wenn keine Benutzer-Items vorhanden sind, geben wir eine leere Liste zurück
        console.log("useItems: Keine Benutzer-Items vorhanden, leere Liste");
        return [];
      } catch (err) {
        console.error("Error in useItems:", err);
        throw err;
      }
    },
    enabled: !isLoadingUserItems,
  });
}

interface AddItemToListData {
  listId: string;
  itemId: string;
  quantity: number;
  notes?: string;
}

export function useAddItemToList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddItemToListData) => {
      console.log("Adding item to list with data:", data);

      const { error } = await supabase.from("list_items").insert([
        {
          list_id: data.listId,
          item_id: data.itemId,
          quantity: data.quantity,
          notes: data.notes,
          is_checked: false,
        },
      ]);

      if (error) {
        console.error("Error in useAddItemToList:", error);
        throw error;
      }

      console.log("Successfully added item to list");
    },
    onSuccess: (_, variables) => {
      console.log("Invalidating queries for list:", variables.listId);
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
    },
    onError: (error) => {
      console.error("Mutation error in useAddItemToList:", error);
    },
  });
}

interface CreateCustomItemData {
  name: string;
}

export function useCreateCustomItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomItemData) => {
      try {
        console.log("Creating custom item with name:", data.name);

        // Zuerst prüfen, ob das Item bereits existiert
        const { data: existingItems, error: searchError } = await supabase
          .from("items")
          .select("*")
          .ilike("name", data.name.trim())
          .limit(1);

        if (searchError) {
          console.error("Error searching for existing item:", searchError);
          throw searchError;
        }

        console.log("Existing items found:", existingItems);

        if (existingItems && existingItems.length > 0) {
          console.log("Returning existing item:", existingItems[0]);
          return existingItems[0];
        }

        // Wenn nicht, erstellen wir ein neues Item
        const { data: newItem, error: insertError } = await supabase
          .from("items")
          .insert([
            {
              name: data.name.trim(),
              is_popular: false,
              is_custom: true,
              created_by: user?.id,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("Error creating new item:", insertError);
          throw new Error("Fehler beim Erstellen des Items");
        }

        console.log("Successfully created new item:", newItem);
        return newItem;
      } catch (err) {
        console.error("Error in createCustomItem:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log("Custom item creation successful:", data);
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error) => {
      console.error("Mutation error in useCreateCustomItem:", error);
    },
  });
}
