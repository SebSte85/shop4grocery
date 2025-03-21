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

    // Verarbeite verschiedene Event-Typen
    switch (event.type) {
      case 'checkout.session.completed': {
        // This event is critical for completing subscription activation
        console.log('Processing checkout.session.completed event');
        const session = event.data.object;
        
        // Enhanced debug logging
        console.log(`CHECKOUT DEBUG: Session ID: ${session.id}`);
        console.log(`CHECKOUT DEBUG: Session Mode: ${session.mode}`);
        console.log(`CHECKOUT DEBUG: Client Reference ID: ${session.client_reference_id || 'none'}`);
        console.log(`CHECKOUT DEBUG: Session Metadata: ${JSON.stringify(session.metadata || {})}`);
        
        // Make sure this is a subscription-related checkout
        if (session.mode === 'subscription') {
          console.log(`CHECKOUT DEBUG: Subscription session, subscription ID: ${session.subscription}`);
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          console.log(`Retrieved subscription ${subscription.id} with status ${subscription.status}`);
          
          // Get customer ID and find the user
          const customerId = subscription.customer;
          let userId = null;
          
          // Try different methods to find the user ID
          if (session.client_reference_id) {
            userId = session.client_reference_id;
            console.log(`Found userId in client_reference_id: ${userId}`);
          } else if (subscription.metadata?.userId) {
            userId = subscription.metadata.userId;
            console.log(`Found userId in subscription metadata: ${userId}`);
          } else if (session.metadata?.userId) {
            userId = session.metadata.userId;
            console.log(`Found userId in session metadata: ${userId}`);
          } else {
            // Look up in database
            const { data: userData } = await supabase
              .from('user_subscriptions')
              .select('user_id')
              .eq('stripe_subscription_id', subscription.id)
              .maybeSingle();
              
            if (userData) {
              userId = userData.user_id;
              console.log(`Found userId in database by subscription ID: ${userId}`);
            } else {
              // Try by customer ID
              const { data: customerData } = await supabase
                .from('user_subscriptions')
                .select('user_id')
                .eq('stripe_customer_id', customerId)
                .maybeSingle();
                
              if (customerData) {
                userId = customerData.user_id;
                console.log(`Found userId in database by customer ID: ${userId}`);
              }
            }
          }
          
          if (userId) {
            console.log(`Activating subscription for user ${userId}`);
            
            // Get current subscription status from database first
            const { data: currentSub, error: fetchError } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (currentSub) {
              console.log(`CHECKOUT DEBUG: Found existing subscription for user ${userId}, updating it`);
              // Force active status since checkout is complete - UPDATE instead of UPSERT
              const { data, error } = await supabase
                .from('user_subscriptions')
                .update({
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscription.id,
                  status: 'active',
                  display_status: 'active',
                  access_granted: true,
                  plan: 'premium',
                  interval: subscription.items.data[0]?.plan.interval || 'year',
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
              
              if (error) {
                console.error('Error updating subscription after checkout completion:', error);
              } else {
                console.log('Successfully activated existing subscription after checkout completion');
                await checkAndCleanupMultipleSubscriptions(userId, subscription.id);
              }
            } else {
              console.log(`CHECKOUT DEBUG: No existing subscription found, creating new record`);
              // Create a new record if none exists
              const { data, error } = await supabase
                .from('user_subscriptions')
                .insert({
                  user_id: userId,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscription.id,
                  status: 'active',
                  display_status: 'active',
                  access_granted: true,
                  plan: 'premium',
                  interval: subscription.items.data[0]?.plan.interval || 'year',
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  updated_at: new Date().toISOString(),
                  created_at: new Date().toISOString()
                });
                
              if (error) {
                console.error('Error creating subscription after checkout completion:', error);
              } else {
                console.log('Successfully created new subscription after checkout completion');
              }
            }
          } else {
            console.error('Could not find user ID for subscription', subscription.id);
          }
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        // Dieser Event wird ausgelöst, wenn eine Rechnung bezahlt wurde
        // Für Abonnements bedeutet das, dass das Abo jetzt aktiv ist
        console.log('Processing invoice.payment_succeeded event');
        const invoice = event.data.object;
        
        // Detailliertere Protokollierung
        console.log(`PAYMENT DEBUG: Invoice ID: ${invoice.id}, Status: ${invoice.status}, Amount: ${invoice.amount_paid}`);
        console.log(`PAYMENT DEBUG: Invoice Metadata: ${JSON.stringify(invoice.metadata || {})}`);
        
        // Prüfen, ob die Rechnung zu einem Abonnement gehört
        if (invoice.subscription) {
          console.log(`PAYMENT DEBUG: Invoice is for subscription: ${invoice.subscription}`);
          await handleSuccessfulSubscriptionPayment(invoice);
        } else {
          console.log('PAYMENT DEBUG: Invoice has no subscription, ignoring');
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
      case 'customer.subscription.updated':
        console.log('Subscription updated event received:', event.data.object.id);
        
        // Speziell prüfen, ob der Status von "incomplete" zu "active" geändert wurde
        const subscription = event.data.object;
        const previousAttributes = event.data.previous_attributes;
        
        if (previousAttributes && 'status' in previousAttributes) {
          const oldStatus = previousAttributes.status;
          const newStatus = subscription.status;
          
          console.log(`Subscription status changed from ${oldStatus} to ${newStatus}`);
          
          // Wenn der Status zu "active" wechselt, aktualisiere die Datenbank
          if (newStatus === 'active' && oldStatus === 'incomplete') {
            console.log('Processing subscription activation after status change to active');
            
            // Suche die User ID in verschiedenen Quellen
            let userId = subscription.metadata?.userId || 
                         subscription.metadata?.supabaseUserId;
                
            // Wenn keine User ID in Metadaten, versuche sie aus der Datenbank zu holen
            if (!userId) {
              console.log('No userId found in subscription metadata, searching in database');
              
              // Suche nach der subscription_id in der Datenbank
              const { data: subscriptionData, error: subscriptionError } = await supabase
                .from('user_subscriptions')
                .select('user_id')
                .eq('stripe_subscription_id', subscription.id)
                .maybeSingle();
                
              if (subscriptionError) {
                console.error('Error fetching userId from subscription record:', subscriptionError);
              } else if (subscriptionData) {
                userId = subscriptionData.user_id;
                console.log('Found userId in database:', userId);
              }
              
              // Wenn immer noch kein userId, versuche über Customer-ID zu finden
              if (!userId) {
                console.log('Trying to find user by customer ID:', subscription.customer);
                const { data: customerData, error: customerError } = await supabase
                  .from('user_subscriptions')
                  .select('user_id')
                  .eq('stripe_customer_id', subscription.customer)
                  .maybeSingle();
                  
                if (customerError) {
                  console.error('Error fetching userId from customer record:', customerError);
                } else if (customerData) {
                  userId = customerData.user_id;
                  console.log('Found userId by customer ID:', userId);
                }
              }
            }
            
            if (userId) {
              console.log(`Updating subscription for user ${userId} to active status`);
              
              // Prüfe zuerst, ob ein Eintrag existiert
              const { data: existingSubscription, error: fetchError } = await supabase
                .from('user_subscriptions')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();
                
              if (fetchError) {
                console.error('Error checking existing subscription:', fetchError);
              }
              
              if (existingSubscription) {
                // Update den bestehenden Eintrag
                const { error: updateError } = await supabase
                  .from('user_subscriptions')
                  .update({
                    status: subscription.status,
                    plan: 'premium',
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', userId);
                  
                if (updateError) {
                  console.error('Error updating subscription:', updateError);
                } else {
                  console.log('Successfully updated subscription to active status');
                }
              } else {
                // Erstelle einen neuen Eintrag falls keiner existiert
                const { error: insertError } = await supabase
                  .from('user_subscriptions')
                  .insert({
                    user_id: userId,
                    stripe_subscription_id: subscription.id,
                    stripe_customer_id: subscription.customer,
                    status: subscription.status,
                    plan: 'premium',
                    interval: 'year',
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                  
                if (insertError) {
                  console.error('Error creating subscription record:', insertError);
                } else {
                  console.log('Successfully created new subscription record');
                }
              }
            } else {
              console.error('Could not find userId for subscription:', subscription.id);
            }
          }
        }
        break;
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
  // Ausführliche Protokollierung für bessere Fehlerbehebung
  console.log(`Processing invoice.payment_succeeded for invoice ID: ${invoice.id}`);
  console.log(`INVOICE DEBUG: Invoice status: ${invoice.status}, paid: ${invoice.paid}`);
  console.log(`INVOICE DEBUG: Invoice object: ${JSON.stringify(invoice.object)}`);
  console.log(`INVOICE DEBUG: Full status: ${JSON.stringify({
    status: invoice.status,
    paid: invoice.paid,
    amount_paid: invoice.amount_paid,
    attempt_count: invoice.attempt_count,
    payment_intent: invoice.payment_intent || 'none'
  })}`);
  
  // Abonnement-ID aus der Rechnung extrahieren
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;
  
  if (!subscriptionId || !customerId) {
    console.error('Keine subscription_id oder customer_id in der Invoice gefunden', invoice.id);
    return;
  }
  
  console.log(`INVOICE DEBUG: Found subscription ID: ${subscriptionId}, customer ID: ${customerId}`);
  
  // UserId direkt aus den Metadaten der Rechnung extrahieren, wenn möglich
  let userId = null;
  
  // Versuch 1: Metadaten der Rechnungsposition prüfen
  if (invoice.lines?.data?.[0]?.metadata?.userId) {
    userId = invoice.lines.data[0].metadata.userId;
    console.log(`Found userId in invoice line metadata: ${userId}`);
  }
  
  // Versuch 2: Metadaten der Subscription in der Rechnung prüfen
  if (!userId && invoice.subscription_details?.metadata?.userId) {
    userId = invoice.subscription_details.metadata.userId;
    console.log(`Found userId in subscription_details metadata: ${userId}`);
  }
  
  // Nur wenn wir keine userId in den Metadaten finden, Stripe API abfragen
  if (!userId) {
    try {
      // Abonnementdetails abrufen
      console.log(`Retrieving subscription details for ${subscriptionId}`);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`Subscription status: ${subscription.status}`);
      
      // Versuch 3: Prüfe subscription.metadata nach userId
      if (subscription.metadata && subscription.metadata.userId) {
        userId = subscription.metadata.userId;
        console.log(`Extracted userId from subscription metadata: ${userId}`);
      } 
      // Versuch 4: Benutzer anhand der Stripe-Kunden-ID in der Datenbank finden
      else {
        const { data: userData, error } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        
        if (!error && userData) {
          userId = userData.user_id;
          console.log(`Found userId in database: ${userId}`);
        } else {
          console.log(`No user found with customer ID ${customerId}, checking customer metadata`);
          
          // Versuch 5: Prüfe customer.metadata nach supabaseUserId
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
      }
      
      // Wenn wir eine userId gefunden haben, aktualisieren wir die Datenbank direkt
      if (userId) {
        // Direkte Aktualisierung in der Datenbank, Status auf 'active' setzen
        console.log(`INVOICE DEBUG: Directly updating subscription status to active for user ${userId}`);
        
        // Check if a record exists first
        const { data: currentSubscription, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (currentSubscription) {
          console.log(`INVOICE METADATA DEBUG: Found existing subscription for user ${userId}, updating it`);
          // Update the existing record instead of upsert
          const { data, error } = await supabase
            .from('user_subscriptions')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: 'active',
              display_status: 'active',
              access_granted: true,
              plan: 'premium',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          
          if (error) {
            console.error('CRITICAL ERROR: Failed to update subscription from metadata:', error);
          } else {
            console.log(`SUCCESS: Subscription for user ${userId} activated from metadata`);
            
            // Prüfen und bereinigen von mehreren Abonnement-Einträgen
            await checkAndCleanupMultipleSubscriptions(userId, subscriptionId);
          }
        } else {
          console.log(`INVOICE METADATA DEBUG: No existing subscription found, creating new record`);
          // Create a new record if none exists
          const { data, error } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: 'active',
              display_status: 'active',
              access_granted: true,
              plan: 'premium',
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            });
          
          if (error) {
            console.error('Error creating subscription from metadata:', error);
          } else {
            console.log(`SUCCESS: New subscription record created for user ${userId} from metadata`);
          }
        }
      }
    } catch (err) {
      console.error('Error processing subscription payment:', err);
    }
  } else {
    // Wenn userId direkt aus den Metadaten gefunden wurde, direkt aktualisieren
    console.log(`Updating subscription status for user ${userId} from invoice metadata`);
    
    // Check if a record exists first
    const { data: currentSubscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (currentSubscription) {
      console.log(`INVOICE METADATA DEBUG: Found existing subscription for user ${userId}, updating it`);
      // Update the existing record instead of upsert
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          display_status: 'active',
          access_granted: true,
          plan: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) {
        console.error('CRITICAL ERROR: Failed to update subscription from metadata:', error);
      } else {
        console.log(`SUCCESS: Subscription for user ${userId} activated from metadata`);
        
        // Prüfen und bereinigen von mehreren Abonnement-Einträgen
        await checkAndCleanupMultipleSubscriptions(userId, subscriptionId);
      }
    } else {
      console.log(`INVOICE METADATA DEBUG: No existing subscription found, creating new record`);
      // Create a new record if none exists
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          display_status: 'active',
          access_granted: true,
          plan: 'premium',
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error creating subscription from metadata:', error);
      } else {
        console.log(`SUCCESS: New subscription record created for user ${userId} from metadata`);
      }
    }
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

// Hilfsfunktion zum Prüfen und Bereinigen von mehreren Abonnement-Einträgen für einen Benutzer
async function checkAndCleanupMultipleSubscriptions(userId: string, activeSubscriptionId: string) {
  console.log(`Checking for multiple subscriptions for user ${userId}`);
  try {
    // Alle Abonnements für diesen Benutzer suchen
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Fehler beim Prüfen auf mehrere Abonnements:', error);
      return;
    }
    
    if (!data || data.length <= 1) {
      console.log('Keine mehrfachen Abonnements gefunden');
      return;
    }
    
    console.log(`Gefunden: ${data.length} Abonnement-Einträge für Benutzer ${userId}`);
    
    // Nach abgeschlossener Zahlung: Veraltete oder widersprüchliche Einträge bereinigen
    for (const sub of data) {
      // Das aktive Abonnement überspringen
      if (sub.stripe_subscription_id === activeSubscriptionId) {
        console.log(`Aktives Abonnement: ${sub.stripe_subscription_id}`);
        continue;
      }
      
      // Status prüfen - veraltete oder unvollständige Einträge zurücksetzen
      console.log(`Bereinige veraltetes Abonnement: ${sub.stripe_subscription_id}`);
      
      // Entweder aktualisieren...
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'incomplete_expired',
          display_status: 'inactive',
          access_granted: false,
          plan: 'free',
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);
        
      if (updateError) {
        console.error(`Fehler beim Aktualisieren des veralteten Abonnements ${sub.id}:`, updateError);
      } else {
        console.log(`Veraltetes Abonnement ${sub.id} erfolgreich aktualisiert`);
      }
    }
  } catch (err) {
    console.error('Fehler bei der Bereinigung mehrerer Abonnements:', err);
  }
}

// Hilfsfunktion zum Aktualisieren des Abonnements in der Datenbank
async function updateSubscriptionInDatabase(subscription: any, userId: string, customerId: string) {
  // Ausführliche Protokollierung hinzufügen
  console.log(`DB UPDATE DEBUG: Updating subscription in database: ${subscription.id} for user ${userId}`);
  console.log(`DB UPDATE DEBUG: Subscription status from Stripe: ${subscription.status}`);
  console.log(`DB UPDATE DEBUG: Subscription details: ${JSON.stringify({
    id: subscription.id,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: subscription.current_period_end
  })}`);
  
  // Get current subscription status from database first
  const { data: currentSubscription, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (currentSubscription) {
    console.log(`DB UPDATE DEBUG: Current subscription state in DB: ${JSON.stringify({
      status: currentSubscription.status,
      display_status: currentSubscription.display_status,
      access_granted: currentSubscription.access_granted,
      plan: currentSubscription.plan
    })}`);
  } else {
    console.log(`DB UPDATE DEBUG: No existing subscription found in DB for user ${userId}`);
  }
  
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
      // FIX: Never treat incomplete subscriptions as active
      displayStatus = 'pending';
      accessGranted = false;
      // If it's incomplete, always set to free plan
      plan = 'free';
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