import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Item } from "@/types/database.types";
import { useAuth } from "./useAuth";
import { guessCategoryForItem } from "./useCategories";

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
  unit?: string; // Einheit für das Item
  notes?: string;
  categoryId?: string; // Optional category ID for updating
}

export function useAddItemToList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddItemToListData) => {
      console.log("Adding item to list with data:", data);

      // If categoryId is provided, update the item's category
      if (data.categoryId) {
        const { error: updateError } = await supabase
          .from("items")
          .update({ category_id: data.categoryId })
          .eq("id", data.itemId);

        if (updateError) {
          console.error("Error updating item category:", updateError);
          throw updateError;
        }
      }

      const { error } = await supabase.from("list_items").insert([
        {
          list_id: data.listId,
          item_id: data.itemId,
          quantity: data.quantity,
          unit: data.unit || "Stück", // Verwende Standard-Einheit, wenn keine angegeben
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
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error) => {
      console.error("Mutation error in useAddItemToList:", error);
    },
  });
}

interface CreateCustomItemData {
  name: string;
  categoryId?: string; // Optional category ID
}

export function useCreateCustomItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomItemData) => {
      if (!user) throw new Error("User not authenticated");

      // Guess category if not provided
      let categoryId = data.categoryId;
      if (!categoryId) {
        const categoryName = guessCategoryForItem(data.name);
        if (categoryName) {
          // Find category ID by name
          const { data: categoryData, error: categoryError } = await supabase
            .from("categories")
            .select("id")
            .eq("name", categoryName)
            .single();

          if (!categoryError && categoryData) {
            categoryId = categoryData.id;
          }
        }
      }

      const { data: item, error } = await supabase
        .from("items")
        .insert([
          {
            name: data.name,
            is_popular: false,
            created_by: user.id,
            is_custom: true,
            category_id: categoryId,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error in useCreateCustomItem:", error);
        throw error;
      }

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error) => {
      console.error("Mutation error in useCreateCustomItem:", error);
    },
  });
}
