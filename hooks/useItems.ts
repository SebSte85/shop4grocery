import { useQuery, useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Item } from "@/types/database.types";
import { useAuth } from "./useAuth";
import { guessCategoryForItem } from "./useCategories";
import { useSubscription } from "./useSubscription";

// Hook zum Abrufen der häufigsten Items des Benutzers aus abgeschlossenen Einkaufssessions
export function useUserPopularItems(limit: number = 20) {
  const { user } = useAuth();

  return useQuery<Item[], Error>({
    queryKey: ["userPopularItems"],
    queryFn: async () => {
      try {
        if (!user?.id) {
          return [];
        }

        // Abfrage, um die häufigsten Items aus den Einkaufssessions des Benutzers zu erhalten
        const { data, error } = await supabase.rpc("get_user_popular_items", {
          user_id_param: user.id,
          limit_param: limit,
        });

        if (error) {
          throw error;
        }

        return data || [];
      } catch (err) {
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

        // Wenn der Benutzer bereits Einkäufe getätigt hat, zeigen wir seine häufigsten Items
        if (userPopularItems.length > 0) {
          return userPopularItems;
        }

        // Wenn keine Benutzer-Items vorhanden sind, geben wir eine leere Liste zurück
        return [];
      } catch (err) {
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
  const { user } = useAuth();
  const { getFeatures, plan } = useSubscription();

  return useMutation({
    mutationFn: async (data: AddItemToListData) => {
      if (!user?.id) {
        throw new Error("Benutzer nicht angemeldet");
      }

      // Get the current item count in the list
      const { data: currentItems, error: countError } = await supabase
        .from("list_items")
        .select("id")
        .eq("list_id", data.listId);

      if (countError) {
        throw new Error("Fehler beim Überprüfen der vorhandenen Items");
      }

      // Check if adding this item would exceed the limit
      const features = getFeatures();
      const maxItems = features.maxItemsPerList as number;
      const currentItemCount = currentItems?.length || 0;

      if (currentItemCount >= maxItems && plan !== "premium") {
        throw new Error(`Limit erreicht! Upgrade auf Premium für mehr als ${maxItems} Items pro Liste.`);
      }

      // If categoryId is provided, update the item's category
      if (data.categoryId) {
        const { error: updateError } = await supabase
          .from("items")
          .update({ category_id: data.categoryId })
          .eq("id", data.itemId);

        if (updateError) {
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
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
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
        throw error;
      }

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export const useCheckedItems = (listId: string, options?: UseMutationOptions<any, Error, number[]>) => {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, number[]>({
    mutationFn: async (itemIds: number[]) => {
      if (!itemIds.length) return;
      
      const { data, error } = await supabase
        .from("list_items")
        .update({ is_checked: true })
        .in("id", itemIds);
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    ...options,
  });
};

export const useAddItem = (listId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getFeatures, plan } = useSubscription();

  interface AddItemData {
    itemId: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }

  return useMutation({
    mutationFn: async (data: AddItemData) => {
      if (!user?.id) {
        throw new Error("Benutzer nicht angemeldet");
      }

      // Get the current item count in the list
      const { data: currentItems, error: countError } = await supabase
        .from("list_items")
        .select("id")
        .eq("list_id", listId);

      if (countError) {
        throw new Error("Fehler beim Überprüfen der vorhandenen Items");
      }

      // Check if adding this item would exceed the limit
      const features = getFeatures();
      const maxItems = features.maxItemsPerList as number;
      const currentItemCount = currentItems?.length || 0;

      if (currentItemCount >= maxItems && plan !== "premium") {
        throw new Error(`Limit erreicht! Upgrade auf Premium für mehr als ${maxItems} Items pro Liste.`);
      }

      const { data: newItem, error } = await supabase.from("list_items").insert([
        {
          list_id: listId,
          item_id: data.itemId,
          quantity: data.quantity,
          unit: data.unit || "Stück",
          notes: data.notes,
          is_checked: false,
        },
      ])
      .select()
      .single();
      
      if (error) {
        throw new Error(`Fehler beim Hinzufügen des Items: ${error.message}`);
      }
      
      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    }
  });
};

export const useUpdateItem = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number, name?: string, quantity?: number, checked?: boolean, categoryId?: number, unit?: string }) => {
      const { data: updatedItem, error: updateError } = await supabase
        .from("list_items")
        .update({
          name: data.name,
          quantity: data.quantity,
          is_checked: data.checked,
          category_id: data.categoryId,
          unit: data.unit,
        })
        .eq("id", data.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Fehler beim Aktualisieren des Items: ${updateError.message}`);
      }
      
      return updatedItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
};

export const useDeleteItem = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data, error } = await supabase
        .from("list_items")
        .delete()
        .eq("id", itemId);
      
      if (error) {
        throw new Error(`Fehler beim Löschen des Items: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
};

export const useMoveItems = (sourceListId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getFeatures, plan } = useSubscription();

  return useMutation({
    mutationFn: async ({ targetListId, itemIds }: { targetListId: string, itemIds: string[] }) => {
      if (!user?.id) {
        throw new Error("Benutzer nicht angemeldet");
      }

      // Get the current item count in the target list
      const { data: currentItems, error: countError } = await supabase
        .from("list_items")
        .select("id")
        .eq("list_id", targetListId);

      if (countError) {
        throw new Error("Fehler beim Überprüfen der vorhandenen Items");
      }

      // Check if adding these items would exceed the limit
      const features = getFeatures();
      const maxItems = features.maxItemsPerList as number;
      const currentItemCount = currentItems?.length || 0;
      const newTotalCount = currentItemCount + itemIds.length;

      if (newTotalCount > maxItems && plan !== "premium") {
        throw new Error(`Limit erreicht! Upgrade auf Premium für mehr als ${maxItems} Items pro Liste.`);
      }

      // Get items to move
      const { data: itemsToMove, error: fetchError } = await supabase
        .from("list_items")
        .select("*")
        .in("id", itemIds);
      
      if (fetchError) {
        throw new Error(`Fehler beim Abrufen der Items: ${fetchError.message}`);
      }
      
      // Add items to new list
      const { error: insertError } = await supabase
        .from("list_items")
        .insert(
          itemsToMove.map(item => ({
            list_id: targetListId,
            item_id: item.item_id,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
            is_checked: item.is_checked,
          }))
        );
      
      if (insertError) {
        throw new Error(`Fehler beim Hinzufügen der Items: ${insertError.message}`);
      }
      
      // Remove items from source list
      const { error: deleteError } = await supabase
        .from("list_items")
        .delete()
        .in("id", itemIds);
      
      if (deleteError) {
        throw new Error(`Fehler beim Löschen der Items: ${deleteError.message}`);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", sourceListId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
};

export const useCopyItems = (sourceListId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getFeatures, plan } = useSubscription();

  return useMutation({
    mutationFn: async ({ targetListId, itemIds }: { targetListId: string, itemIds: string[] }) => {
      if (!user?.id) {
        throw new Error("Benutzer nicht angemeldet");
      }

      // Get the current item count in the target list
      const { data: currentItems, error: countError } = await supabase
        .from("list_items")
        .select("id")
        .eq("list_id", targetListId);

      if (countError) {
        throw new Error("Fehler beim Überprüfen der vorhandenen Items");
      }

      // Check if adding these items would exceed the limit
      const features = getFeatures();
      const maxItems = features.maxItemsPerList as number;
      const currentItemCount = currentItems?.length || 0;
      const newTotalCount = currentItemCount + itemIds.length;

      if (newTotalCount > maxItems && plan !== "premium") {
        throw new Error(`Limit erreicht! Upgrade auf Premium für mehr als ${maxItems} Items pro Liste.`);
      }
      
      // Get items to copy
      const { data: itemsToCopy, error: fetchError } = await supabase
        .from("list_items")
        .select("*")
        .in("id", itemIds);
      
      if (fetchError) {
        throw new Error(`Fehler beim Abrufen der Items: ${fetchError.message}`);
      }
      
      // Add items to target list
      const { data, error } = await supabase
        .from("list_items")
        .insert(
          itemsToCopy.map((item) => ({
            list_id: targetListId,
            item_id: item.item_id,
            quantity: item.quantity,
            unit: item.unit || "Stück",
            is_checked: item.is_checked,
            notes: item.notes,
          }))
        );
      
      if (error) {
        throw new Error(`Fehler beim Kopieren der Items: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
};
