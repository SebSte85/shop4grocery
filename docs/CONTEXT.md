# Korbklick – Dokumentation

## Tech Stack

- Frontend: React Native with Typescript, Expo und Expo Router
- Backend/Database: Supabase
- UI/CSS Framework: Tailwind 4.0
- Zahlungsabwicklung: Stripe API

## Datenbank Schema

### Tabellen

#### users

| Spalte     | Typ       | Beschreibung                               |
| ---------- | --------- | ------------------------------------------ |
| id         | uuid      | Primärschlüssel, generiert von Supabase    |
| email      | varchar   | E-Mail-Adresse des Nutzers                 |
| password   | varchar   | Verschlüsseltes Passwort                   |
| created_at | timestamp | Erstellungszeitpunkt                       |
| updated_at | timestamp | Letzter Aktualisierungszeitpunkt           |
| avatar_url | varchar   | URL zum Profilbild                         |
| full_name  | varchar   | Vollständiger Name des Nutzers             |
| provider   | varchar   | Authentifizierungsanbieter (email, google) |

#### shopping_lists

| Spalte      | Typ       | Beschreibung                     |
| ----------- | --------- | -------------------------------- |
| id          | uuid      | Primärschlüssel                  |
| name        | varchar   | Name der Einkaufsliste           |
| user_id     | uuid      | Fremdschlüssel zu users.id       |
| created_at  | timestamp | Erstellungszeitpunkt             |
| updated_at  | timestamp | Letzter Aktualisierungszeitpunkt |
| is_archived | boolean   | Archivierungsstatus              |

#### list_items

| Spalte     | Typ       | Beschreibung                            |
| ---------- | --------- | --------------------------------------- |
| id         | uuid      | Primärschlüssel                         |
| list_id    | uuid      | Fremdschlüssel zu shopping_lists.id     |
| item_id    | uuid      | Fremdschlüssel zu items.id              |
| quantity   | integer   | Menge des Items                         |
| is_checked | boolean   | Checkbox-Status (gekauft/nicht gekauft) |
| created_at | timestamp | Erstellungszeitpunkt                    |
| updated_at | timestamp | Letzter Aktualisierungszeitpunkt        |
| notes      | text      | Zusätzliche Notizen zum Item            |

#### items

| Spalte      | Typ       | Beschreibung                                           |
| ----------- | --------- | ------------------------------------------------------ |
| id          | uuid      | Primärschlüssel                                        |
| name        | varchar   | Name des Items                                         |
| category_id | uuid      | Fremdschlüssel zu categories.id                        |
| is_popular  | boolean   | Kennzeichnung als populäres Item                       |
| created_at  | timestamp | Erstellungszeitpunkt                                   |
| created_by  | uuid      | Fremdschlüssel zu users.id (wer hat das Item erstellt) |
| is_custom   | boolean   | Kennzeichnung als benutzerdefiniertes Item             |

#### categories

| Spalte | Typ     | Beschreibung                    |
| ------ | ------- | ------------------------------- |
| id     | uuid    | Primärschlüssel                 |
| name   | varchar | Name der Kategorie              |
| icon   | varchar | Icon-Referenz für die Kategorie |

#### user_subscriptions

| Spalte                 | Typ       | Beschreibung                              |
| ---------------------- | --------- | ----------------------------------------- |
| id                     | uuid      | Primärschlüssel                           |
| user_id                | uuid      | Fremdschlüssel zu users.id                |
| stripe_customer_id     | varchar   | Stripe-Kundenkennung                      |
| stripe_subscription_id | varchar   | Stripe-Abonnement-ID                      |
| plan                   | varchar   | Abonnementplan (z.B. 'premium', 'free')   |
| status                 | varchar   | Status des Abonnements                    |
| interval               | varchar   | Abonnementintervall (z.B. 'year')         |
| current_period_start   | timestamp | Beginn der aktuellen Abrechnungsperiode   |
| current_period_end     | timestamp | Ende der aktuellen Abrechnungsperiode     |
| created_at             | timestamp | Erstellungszeitpunkt                      |
| updated_at             | timestamp | Letzter Aktualisierungszeitpunkt          |
| cancel_at_period_end   | boolean   | Ob am Ende der Periode gekündigt wird     |
| display_status         | varchar   | Anzeigbarer Status für die UI             |
| access_granted         | boolean   | Ob Zugriff auf Premium-Funktionen gewährt |
| stripe_product_id      | varchar   | ID des Stripe-Produkts                    |

### Beziehungen

- **users** 1:n **shopping_lists** (Ein Benutzer kann mehrere Einkaufslisten haben)
- **shopping_lists** 1:n **list_items** (Eine Einkaufsliste kann mehrere Items enthalten)
- **items** 1:n **list_items** (Ein Item kann in mehreren Einkaufslisten vorkommen)
- **categories** 1:n **items** (Eine Kategorie kann mehrere Items enthalten)
- **users** 1:n **items** (Ein Benutzer kann mehrere benutzerdefinierte Items erstellen)
- **users** 1:1 **user_subscriptions** (Ein Benutzer kann ein Abonnement haben)

### Indizes

- users(email) - Eindeutiger Index
- shopping_lists(user_id) - Für schnelle Abfragen der Listen eines Benutzers
- list_items(list_id) - Für schnelle Abfragen der Items einer Liste
- items(category_id) - Für schnelle Abfragen der Items einer Kategorie
- items(is_popular) - Für schnelle Abfragen populärer Items
- user_subscriptions(user_id) - Eindeutiger Index für schnellen Zugriff auf Benutzerabonnements

## Ordnerstruktur

```
korbklick/
├── app/                           # Expo Router Hauptverzeichnis
│   ├── (auth)/                    # Authentifizierungsrouten
│   │   ├── login.tsx              # Login-Bildschirm
│   │   ├── register.tsx           # Registrierungsbildschirm
│   │   └── forgot-password.tsx    # Passwort-Wiederherstellung
│   ├── (app)/                     # Geschützte App-Routen (nach Login)
│   │   ├── _layout.tsx            # Layout für App-Routen
│   │   ├── index.tsx              # Meine Listen (Homepage)
│   │   ├── lists/                 # Listen-bezogene Routen
│   │   │   ├── [id]/              # Dynamische Route für einzelne Liste
│   │   │   │   ├── index.tsx      # Liste ansehen
│   │   │   │   └── add-items.tsx  # Items hinzufügen
│   │   │   └── new.tsx            # Neue Liste erstellen
│   │   ├── profile.tsx            # Benutzerprofil
│   │   ├── subscription/          # Abonnement-Routen
│   │   │   └── index.tsx          # Abonnement-Auswahl und -Verwaltung
│   │   └── recipes/               # Rezept-Funktionen (Premium)
│   │       ├── index.tsx          # Rezept-Suche
│   │       └── results.tsx        # Rezept-Ergebnisse
│   ├── _layout.tsx                # Root-Layout
│   └── index.tsx                  # Entry point (Redirect zu auth oder app)
├── components/                    # Wiederverwendbare Komponenten
│   ├── ui/                        # UI-Komponenten
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── forms/                     # Formular-Komponenten
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ListForm.tsx
│   ├── lists/                     # Listen-bezogene Komponenten
│   │   ├── ListCard.tsx
│   │   ├── ListItem.tsx
│   │   └── ItemSelector.tsx
│   ├── subscription/              # Abonnement-Komponenten
│   │   ├── SubscriptionPlans.tsx  # Abonnementplan-Anzeige und -Auswahl
│   │   ├── SubscriptionBadge.tsx  # Abonnementstatus-Anzeige
│   │   └── PremiumFeatureGate.tsx # Zugangskontrolle für Premium-Funktionen
│   ├── profile/                   # Profil-Komponenten
│   │   └── UserProfile.tsx        # Benutzerprofilkomponente
│   ├── recipes/                   # Rezept-Komponenten (Premium-Funktion)
│   │   └── ListSelectorBottomSheet.tsx # Auswahl der Liste für Rezept-Items
│   └── layout/                    # Layout-Komponenten
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Navigation.tsx
├── hooks/                         # Custom Hooks
│   ├── useAuth.ts                 # Authentifizierungs-Hook
│   ├── useLists.ts                # Listen-Hook
│   ├── useItems.ts                # Items-Hook
│   ├── useCategories.ts           # Kategorien-Hook
│   ├── useSubscription.ts         # Abonnement-Hook
│   └── useInitStripe.ts           # Stripe-Initialisierungs-Hook
├── lib/                           # Bibliotheken und Utilities
│   ├── supabase.ts                # Supabase-Client-Konfiguration
│   ├── api/                       # API-Funktionen
│   │   ├── lists.ts               # Listen-API
│   │   ├── items.ts               # Items-API
│   │   └── auth.ts                # Auth-API
│   └── utils/                     # Hilfsfunktionen
│       ├── validation.ts          # Validierungsfunktionen
│       └── formatters.ts          # Formatierungsfunktionen
├── services/                      # Dienst-Integrationen
│   └── stripeService.ts           # Stripe-Zahlungsintegration
├── types/                         # TypeScript-Typdefinitionen
│   ├── database.types.ts          # Datenbank-Typen
│   ├── api.types.ts               # API-Typen
│   ├── navigation.types.ts        # Navigations-Typen
│   └── subscription.types.ts      # Abonnement-Typen
├── constants/                     # Konstanten
│   ├── colors.ts                  # Farben
│   ├── layout.ts                  # Layout-Konstanten
│   └── config.ts                  # Konfigurationskonstanten
├── assets/                        # Statische Assets
│   ├── images/                    # Bilder
│   └── icons/                     # Icons
├── supabase/                      # Supabase-Konfiguration
│   └── functions/                 # Edge-Funktionen
│       ├── create-subscription/   # Subscription-Erstellung
│       ├── cancel-subscription/   # Subscription-Kündigung
│       ├── stripe-webhook/        # Stripe-Webhook-Handler
│       └── ocr/                   # OCR-Funktionalität für Rechnungsscan
├── app.json                       # Expo-Konfiguration
├── babel.config.js                # Babel-Konfiguration
├── tsconfig.json                  # TypeScript-Konfiguration
├── package.json                   # Abhängigkeiten
└── README.md                      # Projektdokumentation
```

## 1. Überblick

Korbklick ist eine App für Einkaufslisten, die es Nutzern ermöglicht, Einkaufslisten zu erstellen, zu verwalten und mit populären oder benutzerdefinierten Items zu füllen. Die App bietet ein Freemium-Modell mit kostenlosen Basisfunktionen und einem Premium-Abonnement für erweiterte Funktionen.

## 2. Authentifizierung

### 2.1 Login

Der Nutzer kann sich mit folgenden Methoden anmelden:

- **Benutzername & Passwort**
- **Google-Login**

Nach einer erfolgreichen Anmeldung wird der Nutzer auf die Homepage („Meine Listen") weitergeleitet.

## 3. Hauptnavigation

Die App besteht aus folgenden zentralen Bildschirmen:

- **Meine Listen** (Homepage) – Übersicht der Einkaufslisten
- **Liste erstellen** – Erstellen einer neuen Einkaufsliste
- **Liste ansehen** – Anzeigen und Verwalten von Listeninhalten
- **Items hinzufügen** – Auswahl und Eingabe neuer Items
- **Profil** – Benutzerprofil und Abonnement-Verwaltung
- **Abonnement** – Premium-Funktionen und Abonnement-Optionen

## 4. Abonnement-Funktionalität

### 4.1 Premium-Modell

Korbklick bietet ein Freemium-Modell mit folgenden Stufen:

- **Kostenloser Plan**:

  - Begrenzte Anzahl von Einkaufslisten
  - Begrenzte Anzahl von Items pro Liste
  - Grundlegende Funktionen

- **Premium-Abonnement** (4,99 € pro Jahr):
  - Unbegrenzte Einkaufslisten
  - Unbegrenzte Items pro Liste
  - Teilen von Listen mit anderen Benutzern
  - 365 Tage Verlauf
  - Keine Werbung
  - Premium-Support

### 4.2 Zahlungsabwicklung

Die Zahlungsabwicklung erfolgt über die Stripe API mit folgenden Komponenten:

- **Mobile Payment Element**: Für die Zahlungserfassung in der App
- **Stripe Subscriptions API**: Für die Verwaltung von Abonnements
- **Webhooks**: Für asynchrone Ereignisverarbeitung
- **Kündigung**: Benutzer können ihr Abonnement jederzeit kündigen, wobei die Premium-Funktionen bis zum Ende der Abrechnungsperiode verfügbar bleiben

### 4.3 Zugriffskontrolle

Der Zugriff auf Premium-Funktionen wird durch folgende Mechanismen kontrolliert:

- **PremiumFeatureGate**: Komponente zur Beschränkung des Zugriffs auf Premium-Funktionen
- **useSubscription-Hook**: Prüfung des Abonnement-Status und der verfügbaren Funktionen
- **Datenbank-Tabelle user_subscriptions**: Speicherung des Abonnement-Status für jeden Benutzer

## 5. User Flow

### 5.1 Meine Listen (Homepage)

**Zweck:**

- Anzeige aller vorhandenen Einkaufslisten
- Erstellen neuer Listen
- Zugriff auf bestehende Listen

**Aktionen:**

- Klick auf „Neue Liste" → führt zu „Liste erstellen"
- Klick auf eine bestehende Liste → führt zu „Liste ansehen"

### 5.2 Liste erstellen

**Zweck:**

- Erstellung einer neuen Einkaufsliste mit individuellem Namen

**Aktionen:**

- Nutzer gibt einen Namen für die Liste ein
- Klick auf den Button „Erstellen" → Liste wird gespeichert
- Automatische Weiterleitung zur „Meine Listen" Seite

### 5.3 Liste ansehen

**Zweck:**

- Anzeige aller Items innerhalb einer Einkaufsliste
- Hinzufügen neuer Items zur Liste

**Aktionen:**

- Liste zeigt alle enthaltenen Items an
- Klick auf den Button „Hinzufügen" → führt zum „Items hinzufügen" Bildschirm

### 5.4 Items hinzufügen

**Zweck:**

- Auswahl und Hinzufügen von Items zur Einkaufsliste

**Aktionen:**

- App zeigt eine Liste mit populären Items (z. B. Brot, Milch)
- Nutzer kann aus dieser Liste Items auswählen
- Zusätzlich kann der Nutzer eigene Items über ein Inputfeld hinzufügen
- Klick auf den Button „Hinzufügen" → Items werden der Liste hinzugefügt
- Automatische Rückkehr zur „Liste ansehen" Seite

### 5.5 Abonnement verwalten

**Zweck:**

- Anzeige der verfügbaren Abonnement-Optionen
- Verwaltung des aktuellen Abonnements

**Aktionen:**

- Nicht-abonnierte Nutzer können ein Premium-Abonnement abschließen
- Abonnierte Nutzer können ihr Abonnement einsehen und kündigen
- Nach Kündigung bleibt das Premium-Abonnement bis zum Ende der Abrechnungsperiode aktiv

## 6. Zusammenfassung

Korbklick bietet eine einfache und leistungsstarke Möglichkeit, Einkaufslisten zu erstellen und zu verwalten. Durch die intuitive Navigation kann der Nutzer schnell Listen anlegen, Items hinzufügen und verwalten. Die Login-Funktionalität sorgt für personalisierte Nutzererfahrungen, während die Vorschläge für populäre Items den Einkaufsprozess erleichtern. Das Freemium-Modell bietet grundlegende Funktionen kostenlos an und ermöglicht über ein jährliches Premium-Abonnement den Zugriff auf erweiterte Funktionen.
