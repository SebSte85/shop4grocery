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
      merchantIdentifier: 'merchant.com.korbklick', // Only needed for Apple Pay
      urlScheme: 'korbklick', // Needed for 3D Secure and bank redirects
    });
    console.log('Stripe initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return false;
  }
};

// Create a subscription following Stripe's documented approach
export const createSubscription = async (priceId: string, userId: string) => {
  try {
    console.log(`Creating subscription with price: ${priceId} for user: ${userId}`);
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session) {
      console.error('Authentication error:', authError);
      throw new Error('Not authenticated');
    }

    // 1. Erstelle eine Subscription auf dem Server (Status: incomplete)
    console.log(`Calling Supabase function: ${SUPABASE_URL}/functions/v1/create-subscription`);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
      },
      body: JSON.stringify({ 
        priceId, 
        userId,
        // Explizite Metadaten für bessere Nachverfolgung
        metadata: {
          userId: userId,
          subscriptionType: 'premium'
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Subscription creation failed:', errorData);
      throw new Error(errorData.error || 'Failed to create subscription');
    }

    const { subscriptionId, clientSecret, status } = await response.json();
    console.log(`Subscription created with ID: ${subscriptionId}, status: ${status}`);

    // 2. Initialisiere den PaymentSheet mit dem Client Secret vom PaymentIntent
    console.log('Initializing payment sheet...');
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'Korbklick',
      returnURL: 'korbklick://subscription',
      appearance: {
        colors: {
          primary: '#8b5cf6', // Violet color to match app theme
        },
      },
    });

    if (initError) {
      console.error('Error initializing payment sheet:', initError);
      throw new Error(`Failed to initialize payment: ${initError.message}`);
    }

    // 3. Zeige den PaymentSheet an
    console.log('Presenting payment sheet...');
    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      console.error('Error presenting payment sheet:', presentError);
      if (presentError.code === 'Canceled') {
        return { 
          status: 'canceled',
          subscriptionId 
        };
      }
      throw new Error(`Payment failed: ${presentError.message}`);
    }

    // 4. Payment erfolgreich - die Subscription wird automatisch aktiviert
    console.log('Payment successful! Subscription should be activated soon.');
    
    // 5. Manuelle Aktualisierung der user_subscriptions Tabelle als Fallback
    // Falls der Webhook nicht richtig funktioniert, stellen wir sicher, dass ein Eintrag existiert
    try {
      const { error: dbError } = await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        status: 'active', // optimistisch als aktiv markieren
        plan: 'premium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      if (dbError) {
        console.log('Fallback DB update error (non-critical):', dbError);
      } else {
        console.log('Fallback DB update successful');
      }
    } catch (dbErr) {
      console.log('Error during fallback DB update (non-critical):', dbErr);
    }
    
    return { 
      status: 'succeeded',
      subscriptionId
    };
  } catch (error) {
    console.error('Error in subscription process:', error);
    throw error;
  }
};

// For backward compatibility
export const createCheckoutSession = createSubscription;

// Check if user has an active subscription
export const checkSubscriptionStatus = async (userId: string) => {
  try {
    // Verwende maybeSingle() statt single(), um Fehler bei keinem Ergebnis zu vermeiden
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Bei Data-Nicht-Nullness prüfen, statt Fehler zu werfen
    if (error && error.code !== 'PGRST116') {
      // Werfe nur "echte" Fehler, nicht den "Keine Zeilen gefunden"-Fehler
      console.warn('Subscription check warning:', error);
    }
    
    // Überprüfen, ob es ein aktives oder zahlendes Abonnement ist
    // FIX: 'incomplete' Subscriptions should NOT be considered active regardless of plan
    const isActive = data?.status === 'active' || 
                     data?.status === 'trialing';
    
    // FIX: Add additional check for access_granted
    const accessGranted = isActive;
    
    
    return {
      isSubscribed: isActive,
      subscription: data || null,
      plan: isActive ? (data?.plan || 'free') : 'free', // Only return premium plan if active
      
      // Erweiterte Status-Informationen
      displayStatus: data?.display_status || 'inactive',
      accessGranted: accessGranted,
      needsAttention: data?.status === 'past_due'
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { 
      isSubscribed: false, 
      subscription: null,
      plan: 'free',
      displayStatus: 'inactive',
      accessGranted: false,
      needsAttention: false
    };
  }
};

// Subscription beenden entsprechend der Stripe-Dokumentation
export const cancelSubscription = async (subscriptionId: string, cancelImmediately = false) => {
  try {
    console.log(`Cancelling subscription: ${subscriptionId}, immediate: ${cancelImmediately}`);
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError || !authData.session) {
      console.error('Authentication error:', authError);
      throw new Error('Not authenticated');
    }

    // Rufe den Supabase Endpunkt zur Kündigung auf
    const response = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
      },
      body: JSON.stringify({ 
        subscriptionId,
        cancelImmediately
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Subscription cancellation failed:', errorData);
      throw new Error(errorData.error || 'Failed to cancel subscription');
    }

    const result = await response.json();
    
    // After cancellation, refresh subscription data in Supabase to ensure consistency
    try {
      await supabase.from('user_subscriptions')
        .update({
          status: cancelImmediately ? 'canceled' : 'active',
          cancel_at_period_end: !cancelImmediately,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);
    } catch (dbError) {
      console.warn('Failed to update local subscription data after cancellation', dbError);
    }
    
    return result;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}; 