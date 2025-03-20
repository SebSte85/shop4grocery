import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';

// Umgebungsvariablen laden
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Stripe Secret Key auswählen (TEST oder LIVE)
const isProduction = Deno.env.get('IS_PRODUCTION') === 'true';
const stripeSecretKey = isProduction 
  ? Deno.env.get('STRIPE_SECRET_KEY_LIVE') || '' 
  : Deno.env.get('STRIPE_SECRET_KEY_TEST') || '';

console.log(`Using ${isProduction ? 'LIVE' : 'TEST'} Stripe mode, key is set: ${!!stripeSecretKey}`);

// Stripe und Supabase initialisieren
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  // CORS-Header für alle Anfragen
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    // Nur POST-Anfragen zulassen
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Methode nicht erlaubt' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Request-Body parsen
    const { priceId, userId } = await req.json();

    if (!priceId || !userId) {
      return new Response(JSON.stringify({ error: 'priceId und userId sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Auth-Token aus dem Header extrahieren
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // JWT-Token extrahieren (Format: "Bearer <token>")
    const token = authHeader.replace('Bearer ', '');

    // Benutzer mit dem Token verifizieren
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prüfen, ob der Benutzer bereits einen Stripe-Kunden hat
    let { data: customerData } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let customerId: string;

    // Falls kein Stripe-Kunde existiert, einen neuen erstellen
    if (!customerData?.stripe_customer_id) {
      // Benutzerdaten für Stripe-Kunde abrufen
      const { data: userData } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      // Stripe-Kunde erstellen
      const customer = await stripe.customers.create({
        email: userData?.email || user.email,
        name: userData?.full_name || user.user_metadata.full_name,
        metadata: {
          supabaseUserId: userId
        }
      });

      customerId = customer.id;

      // Speichere Kunde in der Datenbank
      await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          status: 'incomplete',
          plan: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } else {
      customerId = customerData.stripe_customer_id;
    }

    // Preisdetails abrufen
    const price = await stripe.prices.retrieve(priceId);
    
    // Vorbereiten der Metadaten für den Zahlungsvorgang
    const productId = price.product as string;
    const interval = price.recurring?.interval || 'year';
    const plan = 'premium'; // Standard-Premiumplan
    
    console.log(`Creating payment for customer ${customerId} with price ${priceId}`);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount as number,
      currency: price.currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        productId,
        priceId,
        interval,
        plan,
        isSubscription: 'true' // Markiere als Abonnement für Webhook
      },
    });

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    );

    // Erfolgreiche Antwort mit allen notwendigen Daten
    return new Response(JSON.stringify({
      paymentIntentClientSecret: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
      publishableKey: isProduction 
        ? Deno.env.get('STRIPE_PUBLISHABLE_KEY_LIVE')
        : Deno.env.get('STRIPE_PUBLISHABLE_KEY_TEST'),
      subscription: {
        plan,
        interval,
        priceId,
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    // Fehlerbehandlung
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}); 