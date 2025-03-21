// Subscription plan types
export type SubscriptionPlan = 'free' | 'premium';

export type SubscriptionInterval = 'month' | 'year';

export type SubscriptionStatus = 
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';

// Subscription object stored in Supabase
export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  interval: SubscriptionInterval;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  cancel_at_period_end: boolean;
}

// Subscription features
export interface SubscriptionFeatures {
  maxShoppingLists: number;
  maxItemsPerList: number;
  sharingEnabled: boolean;
  categoriesEnabled: boolean;
  historyDuration: number;
  premiumSupport: boolean;
  adsRemoved: boolean;
}

// Feature limits based on subscription
export const SUBSCRIPTION_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  free: {
    maxShoppingLists: 3,
    maxItemsPerList: 25,
    sharingEnabled: false,
    categoriesEnabled: true,
    historyDuration: 7, // days
    premiumSupport: false,
    adsRemoved: false,
  },
  premium: {
    maxShoppingLists: 999,
    maxItemsPerList: 999,
    sharingEnabled: true,
    categoriesEnabled: true,
    historyDuration: 365, // days
    premiumSupport: true,
    adsRemoved: true,
  },
}; 