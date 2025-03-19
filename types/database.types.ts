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
  owner_id?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_shared?: boolean;
  items: ListItem[];
  shares?: ListShare[];
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
  category_id?: string;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface ShoppingSession {
  id: string;
  user_id: string;
  list_id: string;
  store_name: string;
  total_items: number;
  completed_at: string;
  created_at: string;
}

export interface ShoppingSessionItem {
  id: string;
  session_id: string;
  item_id: string;
  quantity: number;
  unit: Unit;
  created_at: string;
  item?: Item;
}

export type PermissionLevel = "read" | "write" | "admin";

export interface ListShare {
  id: string;
  list_id: string;
  user_id: string;
  permission_level: PermissionLevel;
  created_at: string;
  user?: User;
}

export interface Database {
  users: User;
  shopping_lists: ShoppingList;
  list_items: ListItem;
  items: Item;
  categories: Category;
  list_shares: ListShare;
  user_subscriptions: UserSubscription;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: "free" | "premium";
  status: string;
  interval: "month" | "year";
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  cancel_at_period_end: boolean;
}
