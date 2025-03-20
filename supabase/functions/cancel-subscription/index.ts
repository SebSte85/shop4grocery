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

console.log(`Using ${isProduction ? 'LIVE' : 'TEST'} Stripe mode in cancel-subscription`);

// Stripe und Supabase initialisieren
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  console.log('Cancel subscription function called');
  
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

  // Nur POST-Anfragen zulassen
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Methode nicht erlaubt' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  // Extrahiere den Authorization-Header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  try {
    // Request Body parsen
    const bodyText = await req.text();
    const { subscriptionId, cancelImmediately = false } = JSON.parse(bodyText);
    console.log(`Cancelling subscription ${subscriptionId}, immediate: ${cancelImmediately}`);

    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: 'No subscription ID provided' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // JWT Token aus dem Authorization-Header extrahieren
    const token = authHeader.replace('Bearer ', '');
    
    // Benutzer über JWT authentifizieren
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Überprüfen, ob die Subscription dem Benutzer gehört
    const { data: subscriptionData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subError || !subscriptionData) {
      console.error('Subscription verification error:', subError);
      return new Response(JSON.stringify({ error: 'Subscription not found or not owned by this user' }), {
        status: 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Hier nutzen wir Stripe API, um das Abonnement zu kündigen
    // Es gibt zwei Möglichkeiten:
    // 1. Sofort kündigen (mit sofortigem Ende)
    // 2. Zum Ende der Abrechnungsperiode kündigen (der Benutzer kann die Premium-Funktionen noch bis zum Ende der bezahlten Periode nutzen)
    let canceledSubscription;
    
    if (cancelImmediately) {
      // Sofortige Kündigung
      canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
      console.log(`Subscription ${subscriptionId} canceled immediately`);
    } else {
      // Kündigung zum Ende der Abrechnungsperiode
      canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      console.log(`Subscription ${subscriptionId} scheduled to cancel at period end`);
    }

    // Aktualisiere den Eintrag in der Datenbank
    // Dies ist ein Fallback, falls der Webhook nicht funktioniert
    const { data: updateData, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: cancelImmediately ? 'canceled' : canceledSubscription.status,
        cancel_at_period_end: cancelImmediately ? false : true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Wir wollen trotzdem ein Erfolgs-Response zurückgeben, da die Kündigung bei Stripe erfolgt ist
    }

    // Erfolgsantwort senden
    return new Response(JSON.stringify({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000).toISOString()
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return new Response(JSON.stringify({ error: error.message || 'An error occurred' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}); 