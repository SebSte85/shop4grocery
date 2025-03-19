import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { checkSubscriptionStatus, createCheckoutSession } from '@/services/stripeService';
import { SUBSCRIPTION_FEATURES, SubscriptionPlan, UserSubscription, SubscriptionFeatures } from '@/types/subscription.types';
import { useEffect, useState } from 'react';

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);

  // Get current subscription status
  const { data, isLoading, error } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return { isSubscribed: false, subscription: null, plan: 'free' as SubscriptionPlan };
      const result = await checkSubscriptionStatus(user.id);
      return {
        ...result,
        plan: result.isSubscribed ? result.subscription?.plan : 'free' as SubscriptionPlan
      };
    },
    enabled: !!user,
  });

  // Subscribe mutation
  const { mutateAsync: subscribeAsync, isPending: isSubscribing } = useMutation({
    mutationFn: async (priceId: string) => {
      if (!user) throw new Error('User not authenticated');
      return createCheckoutSession(priceId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
    },
  });

  // Expose a Promise-based version of subscribe
  const subscribe = async (priceId: string) => {
    return subscribeAsync(priceId);
  };

  // Get features based on subscription plan
  const getFeatures = () => {
    const plan = (data?.plan || 'free') as SubscriptionPlan;
    return SUBSCRIPTION_FEATURES[plan];
  };

  // Check if user can perform specific actions based on subscription
  const canUseFeature = (featureName: keyof SubscriptionFeatures) => {
    // If data isn't loaded yet, default to false to prevent premature access
    if (!data) return false;
    
    const features = getFeatures();
    if (featureName === 'maxShoppingLists' || featureName === 'maxItemsPerList') {
      // These are numeric limits, not boolean flags
      return true;
    }
    return !!features[featureName];
  };

  // Check if a numeric limit is exceeded
  const isLimitExceeded = (
    featureName: 'maxShoppingLists' | 'maxItemsPerList',
    currentCount: number
  ) => {
    const features = getFeatures();
    return currentCount >= features[featureName];
  };

  return {
    isSubscribed: !!data?.isSubscribed,
    subscription: data?.subscription as UserSubscription | null,
    isLoading,
    error,
    subscribe,
    isSubscribing,
    plan: (data?.plan || 'free') as SubscriptionPlan,
    features: getFeatures(),
    canUseFeature,
    isLimitExceeded,
  };
} 