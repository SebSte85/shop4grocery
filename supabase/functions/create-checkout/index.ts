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

const appUrl = Deno.env.get('APP_URL') || 'korbklick://'; // Deine App-URL für Weiterleitungen
console.log(`Using app URL: ${appUrl}`);
console.log(`ENV var APP_URL is: '${Deno.env.get('APP_URL')}'`);

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
    } else {
      customerId = customerData.stripe_customer_id;
    }

    // Erstellen der Checkout-Session
    console.log(`Creating checkout session for customer: ${customerId}, priceId: ${priceId}`);

    // Für Stripe müssen wir eine gültige Web-URL verwenden (kein Deep-Link-Schema)
    // Diese URLs werden später zu deiner App umgeleitet
    const baseWebhookUrl = `${supabaseUrl}/functions/v1/stripe-redirect`;
    const successUrl = `${baseWebhookUrl}?redirect=korbklick://subscription&success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseWebhookUrl}?redirect=korbklick://subscription&canceled=true`;

    console.log(`Success URL will be: ${successUrl}`);
    console.log(`Cancel URL will be: ${cancelUrl}`);

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId
        },
      });

      // Erfolgreiche Antwort mit der Session-ID
      console.log(`Session created successfully: ${session.id}`);
      console.log(`Checkout URL: ${session.url}`);
      
      return new Response(JSON.stringify({ 
        sessionId: session.id, 
        url: session.url
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error(`Error creating checkout session: ${err.message}`);
      console.error(`Error details:`, JSON.stringify(err, null, 2));
      throw err;
    }

  } catch (error) {
    // Fehlerbehandlung
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 