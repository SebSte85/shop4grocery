export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  full_name: string;
  provider: "email" | "google";
}

export interface ShoppingList {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  items: ListItem[];
}

export type Unit = "Stück" | "kg" | "g" | "l" | "ml";

export interface ListItem {
  id: string;
  list_id: string;
  item_id: string;
  quantity: number;
  unit: Unit;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
  notes: string | null;
  item: Item;
}

export interface Item {
  id: string;
  name: string;
  is_popular: boolean;
  created_at: string;
  created_by: string;
  is_custom: boolean;
}

export interface Database {
  users: User;
  shopping_lists: ShoppingList;
  list_items: ListItem;
  items: Item;
}
