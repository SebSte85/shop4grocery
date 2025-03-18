import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ShoppingList, Unit } from "@/types/database.types";
import { useAuth } from "./useAuth";
import { useRouter } from "expo-router";

export function useLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<ShoppingList[]>({
    queryKey: ["lists"],
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
              unit,
              item:items!inner (
                id,
                name,
                is_popular,
                created_at,
                created_by,
                is_custom,
                category_id
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

        // Transform the data to match the expected types
        const transformedData: ShoppingList[] = data.map((list) => ({
          id: list.id,
          name: list.name,
          user_id: list.user_id,
          created_at: list.created_at,
          updated_at: list.updated_at,
          is_archived: list.is_archived,
          items:
            list.items?.map((listItem) => ({
              id: listItem.id,
              list_id: listItem.list_id,
              item_id: listItem.item_id,
              quantity: listItem.quantity,
              unit: listItem.unit || "Stück",
              is_checked: listItem.is_checked,
              created_at: listItem.created_at,
              updated_at: listItem.updated_at,
              notes: listItem.notes,
              item: Array.isArray(listItem.item)
                ? listItem.item[0]
                : listItem.item,
            })) || [],
        }));

        return transformedData;
      } catch (error) {
        console.error("Error in useLists:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
    retry: 2,
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
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useList(id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<ShoppingList>({
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
              unit,
              item:items!inner (
                id,
                name,
                is_popular,
                created_at,
                created_by,
                is_custom,
                category_id
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

        // Transform the data to match the expected types
        const transformedData: ShoppingList = {
          id: data.id,
          name: data.name,
          user_id: data.user_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
          is_archived: data.is_archived,
          items:
            data.items?.map((listItem) => ({
              id: listItem.id,
              list_id: listItem.list_id,
              item_id: listItem.item_id,
              quantity: listItem.quantity,
              unit: listItem.unit || "Stück",
              is_checked: listItem.is_checked,
              created_at: listItem.created_at,
              updated_at: listItem.updated_at,
              notes: listItem.notes,
              item: Array.isArray(listItem.item)
                ? listItem.item[0]
                : listItem.item,
            })) || [],
        };

        "📦 Transformed list data:", transformedData;

        return transformedData;
      } catch (error) {
        console.error("Error in useList:", error);
        throw error;
      }
    },
    enabled: !!id && !!user?.id,
    staleTime: 1000 * 60,
    retry: 2,
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
      const { data, error } = await supabase
        .from("list_items")
        .update({
          is_checked: isChecked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listItemId)
        .select("list_id")
        .single();

      if (error) throw error;
      return { listItemId, isChecked, listId: data.list_id };
    },
    // Optimistische Aktualisierung für bessere UX
    onMutate: async ({ listItemId, isChecked }) => {
      // Queries pausieren
      await queryClient.cancelQueries({ queryKey: ["lists"] });
      await queryClient.cancelQueries({ queryKey: ["list"] });

      // Snapshot des aktuellen Zustands
      const previousLists = queryClient.getQueryData<ShoppingList[]>(["lists"]);
      const previousList = queryClient.getQueryData<ShoppingList>(["list"]);

      // Cache optimistisch aktualisieren
      if (previousLists) {
        queryClient.setQueryData<ShoppingList[]>(["lists"], (lists) =>
          lists?.map((list) => ({
            ...list,
            items: list.items.map((item) =>
              item.id === listItemId ? { ...item, is_checked: isChecked } : item
            ),
          }))
        );
      }

      if (previousList) {
        queryClient.setQueryData<ShoppingList>(["list"], (list) => ({
          ...list!,
          items: list!.items.map((item) =>
            item.id === listItemId ? { ...item, is_checked: isChecked } : item
          ),
        }));
      }

      return { previousLists, previousList };
    },
    onError: (err, variables, context) => {
      // Bei Fehler zum vorherigen Zustand zurückkehren
      if (context?.previousLists) {
        queryClient.setQueryData(["lists"], context.previousLists);
      }
      if (context?.previousList) {
        queryClient.setQueryData(["list"], context.previousList);
      }
    },
    onSettled: (data) => {
      // Queries neu laden
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      if (data?.listId) {
        queryClient.invalidateQueries({ queryKey: ["list", data.listId] });
      }
    },
  });
}

export function useDeleteListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listItemId }: { listItemId: string }) => {
      const { data, error } = await supabase
        .from("list_items")
        .delete()
        .eq("id", listItemId)
        .select("list_id")
        .single();

      if (error) throw error;
      return { listItemId, listId: data.list_id };
    },
    onSuccess: (data) => {
      // Invalidate both the specific list and the lists overview
      queryClient.invalidateQueries({ queryKey: ["list", data.listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useUpdateListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listItemId,
      quantity,
      unit,
    }: {
      listItemId: string;
      quantity: number;
      unit: Unit;
    }) => {
      const { data, error } = await supabase
        .from("list_items")
        .update({
          quantity,
          unit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listItemId)
        .select("list_id")
        .single();

      if (error) throw error;
      return { listItemId, quantity, unit, listId: data.list_id };
    },
    onSettled: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      if (data?.listId) {
        queryClient.invalidateQueries({ queryKey: ["list", data.listId] });
      }
    },
  });
}

export function useDeleteList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (listId: string) => {
      if (!user?.id) {
        throw new Error("Benutzer nicht angemeldet");
      }

      // Zuerst prüfen, ob die Liste dem Benutzer gehört
      const { data: list, error: fetchError } = await supabase
        .from("shopping_lists")
        .select("user_id")
        .eq("id", listId)
        .single();

      if (fetchError) {
        console.error("Error fetching list:", fetchError);
        throw new Error("Fehler beim Laden der Liste");
      }

      if (list.user_id !== user.id) {
        throw new Error("Keine Berechtigung zum Löschen dieser Liste");
      }

      // Liste löschen
      const { error } = await supabase
        .from("shopping_lists")
        .delete()
        .eq("id", listId);

      if (error) {
        console.error("Error deleting list:", error);
        throw new Error("Fehler beim Löschen der Liste");
      }

      return listId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      router.replace("/lists");
    },
  });
}
