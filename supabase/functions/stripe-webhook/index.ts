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

const stripeWebhookSecret = isProduction
  ? Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD') || ''
  : Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST') || '';
console.log(`Webhook secret is set: ${!!stripeWebhookSecret} (${isProduction ? 'PRODUCTION' : 'TEST'} mode)`);

// Stripe und Supabase initialisieren
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  // Nur POST-Anfragen zulassen
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Methode nicht erlaubt' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Stripe-Signatur aus dem Header extrahieren
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Keine Stripe-Signatur gefunden' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Raw-Body für die Signaturüberprüfung abrufen
    const body = await req.text();

    // Event mit Stripe validieren
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      return new Response(JSON.stringify({ error: `Webhook-Fehler: ${err.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verschiedene Event-Typen verarbeiten
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      // Weitere Event-Typen können hier hinzugefügt werden
    }

    // Erfolgreiche Antwort
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Fehlerbehandlung
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Handler für abgeschlossene Checkout-Sessions
async function handleCheckoutSessionCompleted(session) {
  // Benutzer-ID aus den Metadaten extrahieren
  const userId = session.metadata.userId;
  const customerId = session.customer;
  
  if (!userId || !customerId) {
    console.error('Keine userId oder customerId in der Session gefunden');
    return;
  }
  
  // Abrufen des Abonnements
  const subscriptionId = session.subscription;
  if (!subscriptionId) {
    console.error('Kein Abonnement in der Session gefunden');
    return;
  }
  
  // Details des Abonnements abrufen
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Abonnementdetails in der Datenbank speichern
  await updateSubscriptionInDatabase(subscription, userId, customerId);
}

// Handler für Abonnement-Updates
async function handleSubscriptionUpdated(subscription) {
  // Kunde-ID aus dem Abonnement extrahieren
  const customerId = subscription.customer;
  
  // Benutzer anhand der Stripe-Kunden-ID in der Datenbank finden
  const { data: userData, error } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (error || !userData) {
    console.error('Benutzer nicht gefunden', error);
    return;
  }
  
  // Abonnementdetails in der Datenbank aktualisieren
  await updateSubscriptionInDatabase(subscription, userData.user_id, customerId);
}

// Handler für gelöschte Abonnements
async function handleSubscriptionDeleted(subscription) {
  // Kunde-ID aus dem Abonnement extrahieren
  const customerId = subscription.customer;
  
  // Benutzer anhand der Stripe-Kunden-ID in der Datenbank finden
  const { data: userData, error } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (error || !userData) {
    console.error('Benutzer nicht gefunden', error);
    return;
  }
  
  // Abonnement in der Datenbank als gekündigt markieren
  await supabase.from('user_subscriptions').upsert({
    user_id: userData.user_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan: 'free', // Zurück auf kostenlosen Plan
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// Hilfsfunktion zum Aktualisieren des Abonnements in der Datenbank
async function updateSubscriptionInDatabase(subscription, userId, customerId) {
  // Plan-Typ basierend auf dem Produkt bestimmen
  // Hier müssten Sie Ihre eigene Logik implementieren, um den Plan zu bestimmen
  let plan = 'free';
  
  // Prüfen, ob es sich um ein aktives Premium-Abonnement handelt
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // Hier könnten Sie die Produkt-ID überprüfen
    const priceId = subscription.items.data[0]?.price.id;
    
    // Beide Price-IDs unterstützen - sowohl TEST als auch PRODUCTION
    if (priceId === 'price_1R4U7DE8Z1k49fUhsVJvFBCb' || priceId === 'price_1R4UgYE8Z1k49fUhDHSgXGlL') {
      plan = 'premium';
    }
  }
  
  // Abonnementdaten in der Datenbank aktualisieren
  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan: plan,
    interval: subscription.items.data[0]?.plan.interval || 'month',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
  
  // Einfügen oder Aktualisieren des Abonnements
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert(subscriptionData);
  
  if (error) {
    console.error('Fehler beim Aktualisieren des Abonnements:', error);
  }
} 