import { 
  initStripe, 
  initPaymentSheet, 
  presentPaymentSheet 
} from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase'; // Benutze den existierenden authentifizierten Client
import { Platform } from 'react-native';

// Stripe Keys aus den Umgebungsvariablen
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

// Create and handle subscription payment with PaymentSheet
export const createCheckoutSession = async (priceId: string, userId: string) => {
  try {
    console.log(`Creating subscription with price: ${priceId} for user: ${userId}`);
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session) {
      console.error('Authentication error:', authError);
      throw new Error('Not authenticated');
    }

    // Fetch the payment intent details from your backend
    console.log(`Calling Supabase function: ${SUPABASE_URL}/functions/v1/create-subscription-intent`);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-subscription-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
      },
      body: JSON.stringify({ 
        priceId, 
        userId 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Subscription intent creation failed:', errorData);
      throw new Error(errorData.error || 'Failed to create subscription');
    }

    const {
      paymentIntentClientSecret,
      ephemeralKey,
      customer,
      subscription
    } = await response.json();

    console.log('Payment details received successfully');

    // Initialize the Payment Sheet according to Stripe docs
    const { error: initError } = await initPaymentSheet({
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret,
      // Enable Apple Pay / Google Pay
      merchantDisplayName: 'Shop4Grocery',
      // Set up return URL for 3D Secure flows
      returnURL: 'korbklick://subscription',
      // Appearance
      appearance: {
        colors: {
          primary: '#8b5cf6', // Lila wie in der App
        },
      },
    });

    if (initError) {
      console.error('Error initializing payment sheet:', initError);
      throw new Error(`Failed to initialize payment: ${initError.message}`);
    }

    // Present the Payment Sheet
    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      console.error('Error presenting payment sheet:', presentError);
      if (presentError.code === 'Canceled') {
        return { 
          status: 'canceled',
          subscription: null
        };
      }
      throw new Error(`Payment failed: ${presentError.message}`);
    }

    // If we reach here, payment was successful
    console.log('Payment successful!');
    return { 
      status: 'succeeded',
      subscription
    };
  } catch (error) {
    console.error('Error in subscription process:', error);
    throw error;
  }
};

// Check if user has an active subscription
export const checkSubscriptionStatus = async (userId: string) => {
  try {
    // Verwende maybeSingle() statt single(), um Fehler bei keinem Ergebnis zu vermeiden
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    
    // Bei Data-Nicht-Nullness prüfen, statt Fehler zu werfen
    if (error && error.code !== 'PGRST116') {
      // Werfe nur "echte" Fehler, nicht den "Keine Zeilen gefunden"-Fehler
      console.warn('Subscription check warning:', error);
    }
    
    return {
      isSubscribed: !!data,
      subscription: data || null,
      plan: data?.plan || 'free' // Standard-Plan ist "free", wenn kein Abo gefunden wird
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { 
      isSubscribed: false, 
      subscription: null,
      plan: 'free'
    };
  }
}; 