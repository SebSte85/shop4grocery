import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ShoppingList, Unit, PermissionLevel } from "@/types/database.types";
import { useAuth } from "./useAuth";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSubscription } from "./useSubscription";

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

        // Fetch own lists
        const { data: ownLists, error: ownError } = await supabase
          .from("shopping_lists")
          .select(
            `
            id,
            name,
            user_id,
            owner_id,
            created_at,
            updated_at,
            is_archived,
            is_shared,
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

        if (ownError) {
          throw new Error("Fehler beim Laden eigener Listen");
        }

        // Get list ids that are shared with the user
        const { data: sharedListIds, error: sharedIdsError } = await supabase
          .from("list_shares")
          .select("list_id")
          .eq("user_id", user.id);

        if (sharedIdsError) {
          throw new Error("Fehler beim Laden geteilter Listen-IDs");
        }

        // If there are no shared lists, just return own lists
        if (!sharedListIds || sharedListIds.length === 0) {
          return ownLists ? transformListData(ownLists) : [];
        }

        // Extract the list IDs
        const listIds = sharedListIds.map(item => item.list_id);

        // Fetch shared lists
        const { data: sharedLists, error: sharedError } = await supabase
          .from("shopping_lists")
          .select(
            `
            id,
            name,
            user_id,
            owner_id,
            created_at,
            updated_at,
            is_archived,
            is_shared,
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
          .eq("is_archived", false)
          .in("id", listIds);

        if (sharedError) {
          throw new Error("Fehler beim Laden geteilter Listen");
        }

        // Combine lists
        const allLists = [...(ownLists || []), ...(sharedLists || [])];

        if (!allLists) {
          return [];
        }

        return transformListData(allLists);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
    retry: 2,
  });
}

// Helper function to transform list data
function transformListData(lists: any[]): ShoppingList[] {
  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    user_id: list.user_id,
    owner_id: list.owner_id,
    created_at: list.created_at,
    updated_at: list.updated_at,
    is_archived: list.is_archived,
    is_shared: list.is_shared,
    items:
      list.items?.map((listItem: any) => ({
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
}

interface CreateListData {
  name: string;
}

export function useCreateList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getFeatures } = useSubscription();

  return useMutation({
    mutationFn: async (data: CreateListData) => {
      if (!user?.id) {
        throw new Error("Benutzer nicht angemeldet");
      }

      // Get current lists count - only count lists OWNED by the user
      const { data: listsData, error: listsError } = await supabase
        .from("shopping_lists")
        .select("id")
        .eq("user_id", user.id)
        .eq("owner_id", user.id) // Added check to only count owned lists
        .eq("is_archived", false);

      if (listsError) {
        throw new Error("Fehler beim Überprüfen der bestehenden Listen");
      }

      const currentListsCount = listsData.length;
      
      // Get the max lists feature
      const features = getFeatures();
      const maxLists = features.maxShoppingLists as number;
      
      // Strictly enforce the limit - user should not have more than the limit
      if (currentListsCount >= maxLists) {
        throw new Error("Limit erreicht! Upgrade auf Premium für mehr Listen.");
      }

      const { data: newList, error } = await supabase
        .from("shopping_lists")
        .insert([
          {
            name: data.name.trim(),
            user_id: user.id,
            owner_id: user.id, // Explicitly set owner_id to track ownership
            is_archived: false,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error("Fehler beim Erstellen der Liste")
        console.log("Error: ", error)
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

        // Erst prüfen, ob der Benutzer Zugriff auf die Liste hat
        const checkAccess = async () => {
          // Prüfe, ob der Benutzer der Besitzer ist
          const { data: ownList, error: ownError } = await supabase
            .from("shopping_lists")
            .select("id")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (ownList) {
            return true;
          }

          // Prüfe, ob die Liste mit dem Benutzer geteilt wurde
          const { data: sharedList, error: sharedError } = await supabase
            .from("list_shares")
            .select("id")
            .eq("list_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

          return !!sharedList;
        };

        const hasAccess = await checkAccess();
        if (!hasAccess) {
          throw new Error("Liste nicht gefunden");
        }

        // Wenn der Benutzer Zugriff hat, lade die Liste ohne user_id Filter
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
          .single();

        if (error) {
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

        return transformedData;
      } catch (error) {
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

// New hook for list with realtime updates
export function useListWithRealtime(id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Standard useList hook for initial data
  const listQuery = useList(id);

  // Setup realtime subscription
  useEffect(() => {
    if (!id || !user?.id) return;

    // Subscribe to list changes
    const listSubscription = supabase
      .channel(`list-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shopping_lists',
        filter: `id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['list', id] });
      })
      .subscribe();

    // Subscribe to list items changes
    const itemsSubscription = supabase
      .channel(`list-items-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_items',
        filter: `list_id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['list', id] });
      })
      .subscribe();

    // Subscribe to list shares changes
    const sharesSubscription = supabase
      .channel(`list-shares-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_shares',
        filter: `list_id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['list', id] });
        queryClient.invalidateQueries({ queryKey: ['list-shares', id] });
      })
      .subscribe();

    setIsSubscribed(true);

    return () => {
      listSubscription.unsubscribe();
      itemsSubscription.unsubscribe();
      sharesSubscription.unsubscribe();
      setIsSubscribed(false);
    };
  }, [id, user?.id, queryClient]);

  return {
    ...listQuery,
    isSubscribed,
  };
}

// New hook for lists with realtime updates
export function useListsWithRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Standard useLists hook for initial data
  const listsQuery = useLists();

  // Setup realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to shopping_lists changes for this user
    const listsSubscription = supabase
      .channel(`user-lists-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shopping_lists',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['lists'] });
      })
      .subscribe();

    // Subscribe to list_shares changes for this user
    const sharesSubscription = supabase
      .channel(`user-shares-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_shares',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['lists'] });
      })
      .subscribe();

    // General subscription to all list_items changes
    // Wir können nicht nach spezifischen list_ids filtern, da wir hier mehrere Listen haben
    const itemsSubscription = supabase
      .channel(`all-list-items`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_items',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['lists'] });
      })
      .subscribe();

    setIsSubscribed(true);

    return () => {
      listsSubscription.unsubscribe();
      sharesSubscription.unsubscribe();
      itemsSubscription.unsubscribe();
      setIsSubscribed(false);
    };
  }, [user?.id, queryClient]);

  return {
    ...listsQuery,
    isSubscribed,
  };
}
