# Lebensmittel Einkaufsliste App – Dokumentation

## Tech Stack

- Frontend: React Native with Typescript, Expo und Expo Router
- Backend/Database: Supabase
- UI/CSS Framework: Tailwind 4.0

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

### Beziehungen

- **users** 1:n **shopping_lists** (Ein Benutzer kann mehrere Einkaufslisten haben)
- **shopping_lists** 1:n **list_items** (Eine Einkaufsliste kann mehrere Items enthalten)
- **items** 1:n **list_items** (Ein Item kann in mehreren Einkaufslisten vorkommen)
- **categories** 1:n **items** (Eine Kategorie kann mehrere Items enthalten)
- **users** 1:n **items** (Ein Benutzer kann mehrere benutzerdefinierte Items erstellen)

### Indizes

- users(email) - Eindeutiger Index
- shopping_lists(user_id) - Für schnelle Abfragen der Listen eines Benutzers
- list_items(list_id) - Für schnelle Abfragen der Items einer Liste
- items(category_id) - Für schnelle Abfragen der Items einer Kategorie
- items(is_popular) - Für schnelle Abfragen populärer Items

## Ordnerstruktur

```
shop4grocery/
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
│   │   └── profile.tsx            # Benutzerprofil
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
│   └── layout/                    # Layout-Komponenten
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Navigation.tsx
├── hooks/                         # Custom Hooks
│   ├── useAuth.ts                 # Authentifizierungs-Hook
│   ├── useLists.ts                # Listen-Hook
│   ├── useItems.ts                # Items-Hook
│   └── useCategories.ts           # Kategorien-Hook
├── lib/                           # Bibliotheken und Utilities
│   ├── supabase.ts                # Supabase-Client-Konfiguration
│   ├── api/                       # API-Funktionen
│   │   ├── lists.ts               # Listen-API
│   │   ├── items.ts               # Items-API
│   │   └── auth.ts                # Auth-API
│   └── utils/                     # Hilfsfunktionen
│       ├── validation.ts          # Validierungsfunktionen
│       └── formatters.ts          # Formatierungsfunktionen
├── types/                         # TypeScript-Typdefinitionen
│   ├── database.types.ts          # Datenbank-Typen
│   ├── api.types.ts               # API-Typen
│   └── navigation.types.ts        # Navigations-Typen
├── constants/                     # Konstanten
│   ├── colors.ts                  # Farben
│   ├── layout.ts                  # Layout-Konstanten
│   └── config.ts                  # Konfigurationskonstanten
├── assets/                        # Statische Assets
│   ├── images/                    # Bilder
│   └── icons/                     # Icons
├── app.json                       # Expo-Konfiguration
├── babel.config.js                # Babel-Konfiguration
├── tsconfig.json                  # TypeScript-Konfiguration
├── package.json                   # Abhängigkeiten
└── README.md                      # Projektdokumentation
```

## 1. Überblick

Die Lebensmittel Einkaufsliste App ermöglicht es Nutzern, Einkaufslisten zu erstellen, zu verwalten und mit populären oder benutzerdefinierten Items zu füllen. Die App bietet eine intuitive Benutzeroberfläche mit Anmeldemöglichkeiten über Benutzername/Passwort oder Google.

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

## 4. User Flow

### 4.1 Meine Listen (Homepage)

**Zweck:**

- Anzeige aller vorhandenen Einkaufslisten
- Erstellen neuer Listen
- Zugriff auf bestehende Listen

**Aktionen:**

- Klick auf „Neue Liste" → führt zu „Liste erstellen"
- Klick auf eine bestehende Liste → führt zu „Liste ansehen"

### 4.2 Liste erstellen

**Zweck:**

- Erstellung einer neuen Einkaufsliste mit individuellem Namen

**Aktionen:**

- Nutzer gibt einen Namen für die Liste ein
- Klick auf den Button „Erstellen" → Liste wird gespeichert
- Automatische Weiterleitung zur „Meine Listen" Seite

### 4.3 Liste ansehen

**Zweck:**

- Anzeige aller Items innerhalb einer Einkaufsliste
- Hinzufügen neuer Items zur Liste

**Aktionen:**

- Liste zeigt alle enthaltenen Items an
- Klick auf den Button „Hinzufügen" → führt zum „Items hinzufügen" Bildschirm

### 4.4 Items hinzufügen

**Zweck:**

- Auswahl und Hinzufügen von Items zur Einkaufsliste

**Aktionen:**

- App zeigt eine Liste mit populären Items (z. B. Brot, Milch)
- Nutzer kann aus dieser Liste Items auswählen
- Zusätzlich kann der Nutzer eigene Items über ein Inputfeld hinzufügen
- Klick auf den Button „Hinzufügen" → Items werden der Liste hinzugefügt
- Automatische Rückkehr zur „Liste ansehen" Seite

## 5. Zusammenfassung

Diese App bietet eine einfache Möglichkeit, Einkaufslisten zu erstellen und zu verwalten. Durch die intuitive Navigation kann der Nutzer schnell Listen anlegen, Items hinzufügen und verwalten. Die Login-Funktionalität sorgt für personalisierte Nutzererfahrungen, während die Vorschläge für populäre Items den Einkaufsprozess erleichtern.
