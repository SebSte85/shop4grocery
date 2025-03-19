import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { PermissionLevel } from "@/types/database.types";

// Hook to get list shares
export function useListShares(listId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["list-shares", listId],
    queryFn: async () => {
      // Hole zuerst die list_shares Daten
      const { data: shareData, error: shareError } = await supabase
        .from("list_shares")
        .select(
          `
          id,
          list_id,
          user_id,
          permission_level,
          created_at
        `
        )
        .eq("list_id", listId);

      if (shareError) {
        throw new Error("Fehler beim Laden der geteilten Benutzer");
      }

      // Keine Shares gefunden
      if (!shareData || shareData.length === 0) {
        return [];
      }

      // Versuche, die Benutzer direkt aus auth.users zu holen
      // Wir müssen jeden Benutzer einzeln abfragen, weil wir keinen Direktzugriff auf auth.users haben
      const enrichedShares = await Promise.all(
        shareData.map(async (share) => {
          try {
            // Benutzer-ID abfragen
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
              share.user_id
            );

            if (userError || !userData) {
              return {
                ...share,
                user: { email: "Unbekannt" },
              };
            }

            return {
              ...share,
              user: {
                id: userData.user.id,
                email: userData.user.email || "Unbekannt",
                full_name: userData.user.user_metadata?.full_name,
              },
            };
          } catch (error) {
            return {
              ...share,
              user: { email: "Unbekannt" },
            };
          }
        })
      );

      return enrichedShares;
    },
    enabled: !!listId && !!user?.id,
    retry: 1,
  });
}

// Hook for sharing a list
export function useShareList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      email,
      permissionLevel = "write",
    }: {
      listId: string;
      email: string;
      permissionLevel?: PermissionLevel;
    }) => {
      if (!email.trim()) {
        throw new Error("Bitte gib eine E-Mail-Adresse ein");
      }

      try {
        // Using the RPC function for case-insensitive email lookup
        const { data: userData, error: userError } = await supabase.rpc(
          "find_user_by_email_case_insensitive",
          { email_param: email }
        );

        if (userError) {
          console.error("User lookup error:", userError);
          throw new Error("Fehler bei der Benutzersuche");
        }
        
        if (!userData || userData.length === 0) {
          throw new Error(`Kein Benutzer mit der E-Mail ${email} gefunden`);
        }

        const userId = userData[0].id;

        // Überprüfe, ob die Liste bereits mit diesem Benutzer geteilt ist
        const { data: existingShare, error: checkError } = await supabase
          .from("list_shares")
          .select("id")
          .eq("list_id", listId)
          .eq("user_id", userId)
          .single();

        if (existingShare) {
          throw new Error("Die Liste wurde bereits mit diesem Benutzer geteilt");
        }

        // Liste teilen
        const { error: shareError } = await supabase.from("list_shares").insert({
          list_id: listId,
          user_id: userId,
          permission_level: permissionLevel,
        });

        if (shareError) {
          throw new Error("Fehler beim Teilen der Liste");
        }

        // Liste als geteilt markieren
        const { error: updateError } = await supabase
          .from("shopping_lists")
          .update({ is_shared: true })
          .eq("id", listId);

        if (updateError) {
          // Kein Fehler werfen, da das Teilen bereits funktioniert hat
        }

        return { success: true };
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidiere alle relevanten Queries
      queryClient.invalidateQueries({ queryKey: ["list-shares", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

// Hook to remove a user from a shared list
export function useRemoveListShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId, listId }: { shareId: string; listId: string }) => {
      const { error } = await supabase.from("list_shares").delete().eq("id", shareId);

      if (error) {
        throw new Error("Fehler beim Entfernen des Benutzers");
      }

      // Check if there are any shares left
      const { data, error: countError } = await supabase
        .from("list_shares")
        .select("id")
        .eq("list_id", listId);

      if (countError) {
        throw new Error("Fehler beim Überprüfen der verbleibenden Freigaben");
      }

      // If no shares left, update is_shared flag
      if (!data || data.length === 0) {
        await supabase
          .from("shopping_lists")
          .update({ is_shared: false })
          .eq("id", listId);
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-shares", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
} 