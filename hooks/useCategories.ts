import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Category, Item } from "@/types/database.types";
import { useAuth } from "./useAuth";

// Predefined categories with icons and order for supermarket layout
export const DEFAULT_CATEGORIES = [
  { name: "Obst & Gemüse", icon: "leaf", order: 1 },
  { name: "Backwaren", icon: "bread", order: 2 },
  { name: "Milchprodukte", icon: "milk", order: 3 },
  { name: "Fleisch & Wurst", icon: "meat", order: 4 },
  { name: "Tiefkühlwaren", icon: "snow", order: 5 },
  { name: "Getränke", icon: "water", order: 6 },
  { name: "Konserven", icon: "can", order: 7 },
  { name: "Süßigkeiten", icon: "candy", order: 8 },
  { name: "Gewürze", icon: "spice", order: 9 },
  { name: "Haushaltswaren", icon: "home", order: 10 },
  { name: "Sonstiges", icon: "cart", order: 11 },
];

// Keywords for automatic category assignment
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Obst & Gemüse": [
    "apfel",
    "banane",
    "orange",
    "birne",
    "tomate",
    "gurke",
    "salat",
    "karotte",
    "zwiebel",
    "kartoffel",
    "obst",
    "gemüse",
    "beere",
    "zitrone",
    "paprika",
  ],
  Backwaren: [
    "brot",
    "brötchen",
    "toast",
    "croissant",
    "kuchen",
    "gebäck",
    "mehl",
    "zucker",
    "backpulver",
    "hefe",
  ],
  Milchprodukte: [
    "milch",
    "käse",
    "joghurt",
    "quark",
    "sahne",
    "butter",
    "margarine",
    "eier",
    "frischkäse",
    "schmand",
  ],
  "Fleisch & Wurst": [
    "fleisch",
    "wurst",
    "schinken",
    "hähnchen",
    "rind",
    "schwein",
    "fisch",
    "salami",
    "würstchen",
    "hackfleisch",
  ],
  Tiefkühlwaren: [
    "tiefkühl",
    "eis",
    "pizza",
    "fischstäbchen",
    "pommes",
    "tiefkühlgemüse",
    "tiefkühlobst",
    "fertiggericht",
  ],
  Getränke: [
    "wasser",
    "saft",
    "cola",
    "limonade",
    "bier",
    "wein",
    "kaffee",
    "tee",
    "milch",
    "getränk",
  ],
  Konserven: [
    "dose",
    "konserve",
    "thunfisch",
    "mais",
    "erbsen",
    "bohnen",
    "tomaten",
    "ananas",
    "pfirsich",
  ],
  Süßigkeiten: [
    "schokolade",
    "bonbon",
    "keks",
    "süßigkeit",
    "chips",
    "snack",
    "gummibärchen",
    "eis",
    "kuchen",
  ],
  Gewürze: [
    "salz",
    "pfeffer",
    "gewürz",
    "kräuter",
    "oregano",
    "basilikum",
    "zimt",
    "curry",
    "paprika",
  ],
  Haushaltswaren: [
    "toilettenpapier",
    "küchenpapier",
    "seife",
    "waschmittel",
    "spülmittel",
    "reiniger",
    "schwamm",
    "müllbeutel",
  ],
};

// Function to guess category based on item name
export function guessCategoryForItem(itemName: string): string | null {
  const lowerName = itemName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }

  return "Sonstiges"; // Default category if no match
}

// Get all categories
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("order", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }

      return data || [];
    },
  });
}

// Get a category by ID
export function useCategory(categoryId: string | undefined) {
  return useQuery<Category | null>({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      if (!categoryId) return null;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .single();

      if (error) {
        console.error("Error fetching category:", error);
        throw error;
      }

      return data;
    },
    enabled: !!categoryId,
  });
}

// Update an item's category
interface UpdateItemCategoryData {
  itemId: string;
  categoryId: string;
}

export function useUpdateItemCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateItemCategoryData) => {
      const { error } = await supabase
        .from("items")
        .update({ category_id: data.categoryId })
        .eq("id", data.itemId);

      if (error) {
        console.error("Error updating item category:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item", variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

// Initialize categories if they don't exist
export function useInitializeCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Check if categories already exist
      const { data: existingCategories, error: checkError } = await supabase
        .from("categories")
        .select("id")
        .limit(1);

      if (checkError) {
        console.error("Error checking categories:", checkError);
        throw checkError;
      }

      // If categories already exist, do nothing
      if (existingCategories && existingCategories.length > 0) {
        return;
      }

      // Insert default categories
      const { error: insertError } = await supabase.from("categories").insert(
        DEFAULT_CATEGORIES.map((cat) => ({
          name: cat.name,
          icon: cat.icon,
          order: cat.order,
        }))
      );

      if (insertError) {
        console.error("Error initializing categories:", insertError);
        throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
