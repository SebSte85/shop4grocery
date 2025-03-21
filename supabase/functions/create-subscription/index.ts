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
    const { priceId, userId, metadata = {} } = await req.json();

    if (!priceId || !userId) {
      return new Response(JSON.stringify({ error: 'priceId und userId sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Kombinierte Metadaten mit userId sicherstellen
    const combinedMetadata = {
      userId,
      supabaseUserId: userId,
      ...metadata
    };

    console.log(`Creating subscription for user ${userId} with price ${priceId}`);
    console.log(`Using metadata:`, JSON.stringify(combinedMetadata));

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
    } else {
      customerId = customerData.stripe_customer_id;
    }

    console.log(`Creating subscription for customer ${customerId} with price ${priceId}`);

    // Erstelle ein Abonnement im Status "incomplete"
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: combinedMetadata,
      trial_period_days: 0
    });

    // Hole das PaymentIntent-Client-Secret vom ersten Invoice
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice.payment_intent as any;
    const clientSecret = paymentIntent.client_secret;

    console.log(`Created subscription ${subscription.id} with status ${subscription.status}`);

    // Erstelle oder aktualisiere den Eintrag in der Datenbank
    await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan: 'premium', // Wird beim Aktivieren des Abos relevant
      interval: 'year',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Erfolgreiche Antwort mit Client-Secret für den Payment Sheet
    return new Response(JSON.stringify({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      status: subscription.status
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    // Fehlerbehandlung
    console.error('Error creating subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}); 