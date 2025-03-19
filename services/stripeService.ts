import { initStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

// Environment variables for Stripe
const PUBLISHABLE_KEY = 
  process.env.NODE_ENV === 'production'
    ? process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE
    : process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST;

// Unterscheide zwischen Test- und Produktions-Price-IDs
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Price IDs for your subscription plans in Stripe
export const SUBSCRIPTION_PRICES = {
  YEARLY: IS_PRODUCTION 
    ? 'price_1R4U7DE8Z1k49fUhsVJvFBCb'   // Jährliches Abo (4,99€) - PRODUCTION
    : 'price_1R4UgYE8Z1k49fUhDHSgXGlL',  // Jährliches Abo (4,99€) - TEST
};

// Die URL Deiner Supabase-Instanz
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Initialize Stripe
export const initializeStripe = async () => {
  try {
    await initStripe({
      publishableKey: PUBLISHABLE_KEY as string,
      merchantIdentifier: 'merchant.com.shop4grocery', // Only needed for Apple Pay
      urlScheme: 'korbklick', // Needed for 3D Secure and bank redirects
    });
    console.log('Stripe initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return false;
  }
};

// Create a checkout session for subscription using Supabase Function
export const createCheckoutSession = async (priceId: string, userId: string) => {
  try {
    console.log(`Creating checkout session for price: ${priceId} and user: ${userId}`);
    const { data: authData } = await supabase.auth.getSession();
    
    if (!authData.session) {
      throw new Error('Not authenticated');
    }

    console.log(`Calling Supabase function at: ${SUPABASE_URL}/functions/v1/create-checkout`);
    // Call the Supabase Function to create a checkout session
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
      },
      body: JSON.stringify({ priceId, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Checkout session creation failed:', errorData);
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const sessionData = await response.json();
    console.log('Checkout session created successfully:', {
      sessionId: sessionData.sessionId,
      hasUrl: !!sessionData.url
    });

    // Check if we're on a native platform to open browser for payment
    if (Platform.OS !== 'web' && sessionData.url) {
      console.log(`Native platform detected: ${Platform.OS}, URL available`);
      // We'll implement opening the URL in our component using Linking or WebBrowser
      return sessionData;
    }

    return sessionData;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Check if user has an active subscription
export const checkSubscriptionStatus = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error) throw error;
    
    return {
      isSubscribed: !!data,
      subscription: data || null
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { isSubscribed: false, subscription: null };
  }
}; 