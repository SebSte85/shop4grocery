import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Item } from "@/types/database.types";
import { useAuth } from "./useAuth";
import { DEFAULT_POPULAR_ITEMS } from "@/constants/items";

// Hook zum Initialisieren der populären Items
export function useInitializePopularItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Für jedes DEFAULT_POPULAR_ITEM
      for (const item of DEFAULT_POPULAR_ITEMS) {
        // Prüfen ob es bereits existiert
        const { data: existingItems } = await supabase
          .from("items")
          .select("*")
          .eq("name", item.name)
          .eq("is_popular", true)
          .limit(1);

        // Wenn es nicht existiert, erstellen
        if (!existingItems?.length) {
          const { error } = await supabase.from("items").insert([item]);

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useItems(searchText?: string) {
  const { user } = useAuth();

  return useQuery<Item[], Error>({
    queryKey: ["items", searchText],
    queryFn: async () => {
      try {
        // Wenn es einen Suchtext gibt, suchen wir in der Datenbank
        if (searchText?.trim()) {
          const { data, error } = await supabase
            .from("items")
            .select("*")
            .ilike("name", `%${searchText.trim()}%`)
            .order("name");

          if (error) throw error;
          return data || [];
        }

        // Ansonsten holen wir die populären Items aus der Datenbank
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .eq("is_popular", true)
          .order("name");

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error("Error in useItems:", err);
        throw err;
      }
    },
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
