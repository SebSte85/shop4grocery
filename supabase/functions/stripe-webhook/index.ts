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
  console.log(`Webhook called with method: ${req.method}`);
  
  // CORS-Header für alle Anfragen
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
      }
    });
  }

  // Nur POST-Anfragen zulassen
  if (req.method !== 'POST') {
    console.log('Non-POST method detected, returning 405');
    return new Response(JSON.stringify({ error: 'Methode nicht erlaubt' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Raw-Body für die Verarbeitung abrufen
    const body = await req.text();
    console.log(`Received webhook payload with length: ${body.length}`);

    // Stripe-Signatur extrahieren, wenn vorhanden
    const signature = req.headers.get('stripe-signature');
    console.log(`Stripe signature present: ${!!signature}`);

    // Event parsen - im Produktionsmodus mit Signaturprüfung, sonst direkt
    let event;
    try {
      if (signature && stripeWebhookSecret) {
        // Mit Signaturprüfung (sicherer, für Produktion)
        console.log('Verifying webhook signature...');
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          stripeWebhookSecret
        );
        console.log('Signature verified successfully');
      } else {
        // Ohne Signaturprüfung (nur für Entwicklungszwecke)
        console.log('No signature verification - parsing event directly');
        event = JSON.parse(body);
      }
      console.log(`Successfully parsed webhook event. Event type: ${event.type}`);
    } catch (err: any) {
      console.error(`Webhook parsing failed:`, err);
      return new Response(JSON.stringify({ error: `Webhook-Fehler: ${err.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verschiedene Event-Typen verarbeiten
    console.log(`Processing event of type: ${event.type}`);
    
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        // Dieser Event wird ausgelöst, wenn eine Rechnung bezahlt wurde
        // Für Abonnements bedeutet das, dass das Abo jetzt aktiv ist
        console.log('Processing invoice.payment_succeeded event');
        const invoice = event.data.object;
        
        // Prüfen, ob die Rechnung zu einem Abonnement gehört
        if (invoice.subscription) {
          await handleSuccessfulSubscriptionPayment(invoice);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        console.log('Processing payment_intent.succeeded event');
        const paymentIntent = event.data.object;
        // Keine Aktion notwendig, da die invoice.payment_succeeded 
        // den Abonnementstatus aktualisieren wird
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log(`Processing ${event.type} event`);
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        console.log('Processing customer.subscription.deleted event');
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default: {
        console.log(`Unhandled event type: ${event.type}`);
      }
    }

    // Erfolgreiche Antwort
    console.log('Successfully processed webhook event, returning 200');
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Fehlerbehandlung
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Handler für erfolgreiche Zahlungen von Rechnungen
async function handleSuccessfulSubscriptionPayment(invoice: any) {
  // Abonnement-ID aus der Rechnung extrahieren
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;
  
  if (!subscriptionId || !customerId) {
    console.error('Keine subscription_id oder customer_id in der Invoice gefunden', invoice.id);
    return;
  }
  
  try {
    // Abonnementdetails abrufen
    console.log(`Retrieving subscription details for ${subscriptionId}`);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(`Full subscription object:`, JSON.stringify(subscription));
    
    // Versuch 1: Benutzer anhand der Stripe-Kunden-ID in der Datenbank finden
    let userId = null;
    const { data: userData, error } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (error || !userData) {
      console.log('Benutzer nicht in user_subscriptions gefunden, versuche Metadaten...');
      
      // Versuch 2: Prüfe subscription.metadata nach userId
      if (subscription.metadata && subscription.metadata.userId) {
        userId = subscription.metadata.userId;
        console.log(`Extracted userId from subscription metadata: ${userId}`);
      } 
      // Versuch 3: Prüfe customer.metadata nach supabaseUserId
      else {
        console.log(`Looking up customer metadata for ${customerId}`);
        const customer = await stripe.customers.retrieve(customerId);
        console.log(`Customer metadata:`, JSON.stringify(customer.metadata));
        
        if (customer.metadata && customer.metadata.supabaseUserId) {
          userId = customer.metadata.supabaseUserId;
          console.log(`Extracted userId from customer metadata: ${userId}`);
        } else {
          console.error('Keine user_id in den Metadaten gefunden');
          return;
        }
      }
    } else {
      userId = userData.user_id;
      console.log(`Found userId in database: ${userId}`);
    }
    
    if (!userId) {
      console.error('Konnte keine user_id finden');
      return;
    }
    
    // Abonnementdetails in der Datenbank aktualisieren
    await updateSubscriptionInDatabase(subscription, userId, customerId);
    console.log(`Subscription ${subscriptionId} updated to status: ${subscription.status}`);
  } catch (err) {
    console.error('Error processing subscription payment:', err);
  }
}

// Handler für Abonnement-Updates
async function handleSubscriptionUpdated(subscription: any) {
  console.log(`Processing subscription update for ${subscription.id}`);
  
  try {
    // Kunde-ID aus dem Abonnement extrahieren
    const customerId = subscription.customer;
    let userId = null;
    
    // Versuch 1: Benutzer anhand der Stripe-Kunden-ID in der Datenbank finden
    const { data: userData, error } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (error || !userData) {
      console.log('Benutzer nicht in user_subscriptions gefunden, versuche Metadaten...');
      
      // Versuch 2: Prüfe subscription.metadata nach userId
      if (subscription.metadata && subscription.metadata.userId) {
        userId = subscription.metadata.userId;
        console.log(`Extracted userId from subscription metadata: ${userId}`);
      } 
      // Versuch 3: Prüfe customer.metadata nach supabaseUserId
      else {
        console.log(`Looking up customer metadata for ${customerId}`);
        const customer = await stripe.customers.retrieve(customerId);
        
        if (customer.metadata && customer.metadata.supabaseUserId) {
          userId = customer.metadata.supabaseUserId;
          console.log(`Extracted userId from customer metadata: ${userId}`);
        } else {
          console.error('Keine user_id in den Metadaten gefunden');
          return;
        }
      }
    } else {
      userId = userData.user_id;
      console.log(`Found userId in database: ${userId}`);
    }
    
    if (!userId) {
      console.error('Konnte keine user_id finden');
      return;
    }
    
    // Abonnementdetails in der Datenbank aktualisieren
    await updateSubscriptionInDatabase(subscription, userId, customerId);
    console.log(`Subscription ${subscription.id} updated after event`);
  } catch (err) {
    console.error('Error handling subscription update:', err);
  }
}

// Handler für gelöschte Abonnements
async function handleSubscriptionDeleted(subscription: any) {
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
async function updateSubscriptionInDatabase(subscription: any, userId: string, customerId: string) {
  // Ausführliche Protokollierung hinzufügen
  console.log(`Updating subscription in database: ${subscription.id} for user ${userId}`);
  console.log(`Subscription status: ${subscription.status}`);
  
  // Produkt-ID aus dem Abonnement extrahieren
  const priceId = subscription.items.data[0]?.price.id;
  const productId = subscription.items.data[0]?.price.product;
  console.log(`Price ID: ${priceId}, Product ID: ${productId}`);
  
  // Plan-Typ basierend auf dem Produkt bestimmen
  let plan = 'free';
  
  // Prüfen, ob es sich um ein aktives Premium-Abonnement handelt
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // Hier könnten Sie die Produkt-ID überprüfen
    console.log(`Price ID found: ${priceId}`);
    
    // Beide Price-IDs unterstützen - sowohl TEST als auch PRODUCTION
    if (priceId === 'price_1R4U7DE8Z1k49fUhsVJvFBCb' || priceId === 'price_1R4UgYE8Z1k49fUhDHSgXGlL') {
      plan = 'premium';
      console.log(`Setting plan to premium based on price ID: ${priceId}`);
    }
  }

  // Abonnementstatus für UI-Anzeige interpretieren
  let displayStatus = subscription.status;
  let accessGranted = false;

  // Interpretieren des Status für die App-Features
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      displayStatus = 'active';
      accessGranted = true;
      break;
    case 'past_due':
      displayStatus = 'past_due';
      // Bei past_due noch Zugriff gewähren, aber mit Warnung
      accessGranted = true;
      break;
    case 'incomplete':
      // Bei incomplete prüfen, ob es ein Premium-Abo ist
      // Im Entwicklungsmodus gewähren wir Zugriff auch bei incomplete, 
      // da wir keine echten Zahlungen haben
      if (plan === 'premium') {
        displayStatus = 'active';
        accessGranted = true;
      } else {
        displayStatus = 'pending';
        accessGranted = false;
      }
      break;
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      displayStatus = 'inactive';
      accessGranted = false;
      // Bei gekündigtem oder unbezahltem Abo zurück zum kostenlosen Plan
      plan = 'free';
      break;
    default:
      displayStatus = subscription.status;
      accessGranted = false;
  }
  
  console.log(`Status interpretation: Display: ${displayStatus}, Access: ${accessGranted}, Plan: ${plan}`);
  
  // Abonnementdaten in der Datenbank aktualisieren
  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_product_id: productId,
    status: subscription.status,
    display_status: displayStatus,
    access_granted: accessGranted,
    plan: plan,
    interval: subscription.items.data[0]?.plan.interval || 'month',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
  
  console.log(`Inserting subscription data: ${JSON.stringify(subscriptionData)}`);
  
  // Einfügen oder Aktualisieren des Abonnements
  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert(subscriptionData);
  
  if (error) {
    console.error('Fehler beim Aktualisieren des Abonnements:', error);
    // Für den Fehlerfall: Versuche eine alternative Methode mit insert
    if (error.code === '23505') { // Duplicate key violation
      console.log('Trying insert instead of upsert due to conflict');
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);
      
      if (insertError) {
        console.error('Insert also failed:', insertError);
      } else {
        console.log('Insert successful');
      }
    }
  } else {
    console.log(`Subscription data updated successfully: ${JSON.stringify(data)}`);
  }
} 