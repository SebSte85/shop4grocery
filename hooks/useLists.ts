import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ShoppingList } from "@/types/database.types";
import { useAuth } from "./useAuth";

export function useLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<ShoppingList[], Error>({
    queryKey: ["lists", user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) {
          throw new Error("Benutzer nicht angemeldet");
        }

        const { data, error } = await supabase
          .from("shopping_lists")
          .select(
            `
            id,
            name,
            user_id,
            created_at,
            updated_at,
            is_archived,
            items:list_items (
              id,
              list_id,
              item_id,
              quantity,
              is_checked,
              created_at,
              updated_at,
              notes,
              item:items (
                id,
                name,
                is_popular,
                created_at,
                created_by,
                is_custom
              )
            )
          `
          )
          .eq("user_id", user.id)
          .eq("is_archived", false)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching lists:", error);
          throw new Error("Fehler beim Laden der Listen");
        }

        if (!data) {
          return [];
        }

        return data;
      } catch (error) {
        console.error("Error in useLists:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // Cache für 1 Minute
    retry: 2, // Maximal 2 Wiederholungsversuche
  });
}

interface CreateListData {
  name: string;
}

export function useCreateList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateListData) => {
      if (!user?.id) {
        throw new Error("Benutzer nicht angemeldet");
      }

      const { data: newList, error } = await supabase
        .from("shopping_lists")
        .insert([
          {
            name: data.name.trim(),
            user_id: user.id,
            is_archived: false,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating list:", error);
        throw new Error("Fehler beim Erstellen der Liste");
      }

      return newList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", user?.id] });
    },
  });
}

export function useList(id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<ShoppingList, Error>({
    queryKey: ["list", id],
    queryFn: async () => {
      try {
        if (!user?.id) {
          throw new Error("Benutzer nicht angemeldet");
        }

        const { data, error } = await supabase
          .from("shopping_lists")
          .select(
            `
            id,
            name,
            user_id,
            created_at,
            updated_at,
            is_archived,
            items:list_items (
              id,
              list_id,
              item_id,
              quantity,
              is_checked,
              created_at,
              updated_at,
              notes,
              item:items (
                id,
                name,
                is_popular,
                created_at,
                created_by,
                is_custom
              )
            )
          `
          )
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching list:", error);
          throw new Error("Fehler beim Laden der Liste");
        }

        if (!data) {
          throw new Error("Liste nicht gefunden");
        }

        return data;
      } catch (error) {
        console.error("Error in useList:", error);
        throw error;
      }
    },
    enabled: !!id && !!user?.id,
    staleTime: 1000 * 60, // Cache für 1 Minute
    retry: 2, // Maximal 2 Wiederholungsversuche
  });
}

export function useToggleItemCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listItemId,
      isChecked,
    }: {
      listItemId: string;
      isChecked: boolean;
    }) => {
      const { error } = await supabase
        .from("list_items")
        .update({ is_checked: isChecked })
        .eq("id", listItemId)
        .select("list_id")
        .single();

      if (error) throw error;
      return { listItemId, isChecked };
    },
    onSettled: () => {
      // Alle Listen neu laden
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useDeleteListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listItemId }: { listItemId: string }) => {
      const { error } = await supabase
        .from("list_items")
        .delete()
        .eq("id", listItemId)
        .select("list_id")
        .single();

      if (error) throw error;
      return { listItemId };
    },
    onSettled: () => {
      // Alle Listen neu laden
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}
