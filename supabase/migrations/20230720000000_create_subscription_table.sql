-- Erstellen der Tabelle für Benutzerabonnements
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'inactive',
  interval TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique-Constraint für Benutzer-ID und Stripe-Kunden-ID
  CONSTRAINT user_subscription_user_id_unique UNIQUE (user_id),
  CONSTRAINT user_subscription_stripe_customer_id_unique UNIQUE (stripe_customer_id)
);

-- RLS-Regeln für Abonnementtabelle
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Richtlinie: Benutzer können nur ihre eigenen Abonnementdaten sehen
CREATE POLICY "Users can view only their own subscription data"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Webhook-Service kann alle Abonnements aktualisieren
CREATE POLICY "Service role can update all subscriptions"
  ON user_subscriptions
  FOR ALL
  TO service_role
  USING (true);

-- Benutzer können nur ihre eigenen Abonnementdaten aktualisieren (falls nötig)
CREATE POLICY "Users can update only their own subscription data"
  ON user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id); 