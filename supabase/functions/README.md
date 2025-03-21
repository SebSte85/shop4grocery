# Supabase Edge Functions

Dieses Verzeichnis enthält Edge Functions für die Supabase-Integration.

## Funktionen

### `cancel-subscription`

Ermöglicht das Kündigen eines Stripe-Abonnements.

### `delete-account`

Löscht ein Benutzerkonto und alle zugehörigen Daten.

### `stripe-webhook`

Verarbeitet Webhook-Ereignisse von Stripe.

## Deployment

Um die Funktionen zu deployen, führe folgende Befehle aus:

```bash
# Authentifiziere dich bei Supabase
supabase login

# Deploye alle Funktionen
supabase functions deploy

# Oder deploye eine bestimmte Funktion
supabase functions deploy delete-account
```

## Umgebungsvariablen

Die Funktionen benötigen folgende Umgebungsvariablen:

```bash
# Für alle Funktionen
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Für Stripe-bezogene Funktionen
supabase secrets set STRIPE_SECRET_KEY_TEST=your-test-key
supabase secrets set STRIPE_SECRET_KEY_LIVE=your-live-key
supabase secrets set IS_PRODUCTION=false
```

## Lokales Testen

Mit dem Supabase CLI kannst du die Funktionen lokal testen:

```bash
supabase start
supabase functions serve
```

Dann kannst du die Funktion mit einem HTTP-Client wie curl oder Postman testen.
