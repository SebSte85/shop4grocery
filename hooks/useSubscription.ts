import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { checkSubscriptionStatus, createCheckoutSession, createSubscription, SUBSCRIPTION_PRICES, cancelSubscription } from '@/services/stripeService';
import { SUBSCRIPTION_FEATURES, SubscriptionPlan, UserSubscription, SubscriptionFeatures } from '@/types/subscription.types';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

// Interface für den Abonnement-Status
export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscription: any;
  plan: string;
  displayStatus?: string;
  needsAttention?: boolean;
  accessGranted?: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Abonnement-Status mit React Query abrufen
  const { 
    data: subscriptionStatus, 
    isLoading: isSubscriptionLoading,
    error: subscriptionError,
    refetch
  } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) {
        return { 
          isSubscribed: false, 
          subscription: null, 
          plan: 'free',
          displayStatus: 'inactive',
          needsAttention: false,
          accessGranted: false
        };
      }
      try {
        const status = await checkSubscriptionStatus(user.id);
        console.log('Subscription status:', status);
        
        // Erweiterte Status-Interpretation für UI
        const needsAttention = status.subscription?.display_status === 'past_due';
        
        return {
          ...status,
          displayStatus: status.subscription?.display_status || 'inactive',
          needsAttention: needsAttention,
          accessGranted: status.subscription?.access_granted || false
        };
      } catch (error) {
        console.error('Error checking subscription:', error);
        return { 
          isSubscribed: false, 
          subscription: null, 
          plan: 'free',
          displayStatus: 'inactive',
          needsAttention: false,
          accessGranted: false
        };
      }
    },
    enabled: !!user,
    // Daten regelmäßig aktualisieren (alle 30 Sekunden) und beim erneuten Fokus der App
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    // Cache für 2 Minuten behalten
    staleTime: 120000,
  });

  // Manuell den Abonnementstatus aktualisieren nach wichtigen Aktionen
  const refreshSubscriptionStatus = async () => {
    console.log('Refreshing subscription status...');
    await queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
    return refetch();
  };

  // Premium-Abonnement abschließen
  const subscribe = async (priceId = SUBSCRIPTION_PRICES.YEARLY) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsSubscribing(true);

    try {
      const result = await createSubscription(priceId, user.id);
      console.log('Subscription result:', result);
      
      // Nach erfolgreicher Zahlung den Abonnementstatus aktualisieren
      if (result.status === 'succeeded') {
        // Warten und dann den Cache invalidieren
        setTimeout(() => {
          refreshSubscriptionStatus();
        }, 1000); // Kurze Verzögerung, um sicherzustellen, dass der Webhook Zeit hatte
      }
      
      return result;
    } catch (error: any) {
      console.error('Error subscribing:', error);
      Alert.alert('Subscription Error', error.message);
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  // Get features based on subscription plan
  const getFeatures = () => {
    const plan = (subscriptionStatus?.plan || 'free') as SubscriptionPlan;
    return SUBSCRIPTION_FEATURES[plan];
  };

  // Check if user can use a specific feature
  const canUseFeature = (featureName: keyof SubscriptionFeatures) => {
    // If data isn't loaded yet, default to false to prevent premature access
    if (!subscriptionStatus) return false;
    
    // FIX: Only grant access if user has a valid subscription
    // We should never grant access if isSubscribed is false
    if (!subscriptionStatus.isSubscribed) return false;
    
    const features = getFeatures();
    return features[featureName];
  };

  // Check if user has exceeded a limit
  const isLimitExceeded = (featureName: keyof SubscriptionFeatures, currentCount: number) => {
    if (!subscriptionStatus) return true;
    
    // FIX: Only allow premium limits if the user has a valid subscription
    // If not subscribed, always use the free plan limits
    if (!subscriptionStatus.isSubscribed) {
      const freePlanFeatures = SUBSCRIPTION_FEATURES['free'];
      const limit = freePlanFeatures[featureName];
      if (typeof limit === 'number') {
        return currentCount >= limit;
      }
      return false;
    }

    const features = getFeatures();
    // Type-Safe Vergleich: Stelle sicher, dass wir nur Zahlen vergleichen
    const limit = features[featureName];
    if (typeof limit === 'number') {
      return currentCount >= limit;
    }
    // Fallback für boolean Features - hier ist keine Limit-Überschreitung möglich
    return false;
  };

  // Effekt für automatische Aktualisierung beim App-Start
  useEffect(() => {
    if (user) {
      refreshSubscriptionStatus();
    }
  }, [user?.id]);

  // Abonnement kündigen
  const cancelSubscriptionAction = async (cancelImmediately = false) => {
    if (!user || !subscriptionStatus?.subscription?.stripe_subscription_id) {
      throw new Error('No active subscription to cancel');
    }

    try {
      const subscriptionId = subscriptionStatus.subscription.stripe_subscription_id;
      const result = await cancelSubscription(subscriptionId, cancelImmediately);
      console.log('Cancellation result:', result);
      
      // Nach erfolgreicher Kündigung den Abonnementstatus aktualisieren
      // kurze Verzögerung, um sicherzustellen, dass der Webhook Zeit hatte
      setTimeout(() => {
        refreshSubscriptionStatus();
      }, 1000);
      
      return result;
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      Alert.alert('Cancellation Error', error.message);
      throw error;
    }
  };

  return {
    isSubscribed: subscriptionStatus?.isSubscribed || false,
    subscription: subscriptionStatus?.subscription,
    plan: subscriptionStatus?.plan || 'free' as SubscriptionPlan,
    displayStatus: subscriptionStatus?.displayStatus || 'inactive',
    needsAttention: subscriptionStatus?.needsAttention || false,
    accessGranted: subscriptionStatus?.accessGranted || false,
    isLoading: isSubscriptionLoading,
    error: subscriptionError,
    subscribe,
    isSubscribing,
    getFeatures,
    canUseFeature,
    isLimitExceeded,
    refreshSubscriptionStatus,
    cancelSubscription: cancelSubscriptionAction,
  };
} 