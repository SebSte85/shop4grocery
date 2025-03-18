// Supabase Edge Function für OCR-Verarbeitung
// Verarbeitet Bild-Uploads und sendet sie an die Google Cloud Vision API

// Die Credentials sollten als Supabase Secret gespeichert werden
// mit dem Befehl: 'supabase secrets set GOOGLE_VISION_API_KEY="YOUR_API_KEY"'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GOOGLE_VISION_API_URL =
  "https://vision.googleapis.com/v1/images:annotate";

// Diese Funktion holt den API Key aus den Umgebungsvariablen
async function getGoogleAuthToken() {
  try {
    // Verwende den API Key statt JSON-Credentials
    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");

    if (!apiKey) {
      throw new Error("GOOGLE_VISION_API_KEY ist nicht konfiguriert");
    }

    // Gib den API Key direkt zurück
    return apiKey;

    // In echter Produktion müsstest du ggf. einen externen OAuth-Service nutzen
    // oder einen Ansatz mit Supabase Storage implementieren

    return "SIMULATED_TOKEN"; // Platzhalter für echtes Token
  } catch (error) {
    console.error("Fehler beim Abrufen des Google Auth Tokens:", error);
    throw error;
  }
}

// Hauptfunktion zur Verarbeitung der Anfragen
serve(async (req) => {
  // CORS-Unterstützung
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Nur POST-Anfragen zulassen
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Nur POST-Anfragen sind erlaubt" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    // Request-Body abrufen
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({
          error:
            'Keine Bilddaten gefunden. Bitte sende ein Base64-kodiertes Bild im "image"-Feld.',
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Bereite das Google Vision API Request vor
    const visionRequest = {
      requests: [
        {
          image: {
            content: image,
          },
          features: [
            {
              type: "TEXT_DETECTION",
              maxResults: 1,
            },
          ],
          imageContext: {
            languageHints: ["de"],
          },
        },
      ],
    };

    // Authentifizierung für die Google Vision API
    // Im Produktionscode würdest du hier ein korrektes OAuth-Token verwenden
    const apiKey = await getGoogleAuthToken();

    // Rufe die Google Vision API auf
    const visionResponse = await fetch(
      `${GOOGLE_VISION_API_URL}?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // In dieser vereinfachten Version nehmen wir an, dass ein API-Key verwendet wird
          // In einer Produktionsumgebung würdest du folgendes verwenden:
          // 'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(visionRequest),
      }
    );

    // Verarbeite die Antwort der Vision API
    const visionData = await visionResponse.json();
    
    console.log("Google Vision API Antwort:", JSON.stringify(visionData));
    
    // Prüfe, ob die API-Antwort Texterkennungsergebnisse enthält
    if (
      !visionData.responses ||
      !visionData.responses[0] ||
      !visionData.responses[0].textAnnotations ||
      visionData.responses[0].textAnnotations.length === 0
    ) {
      console.log("Keine Textannotation gefunden in der API-Antwort");
      return new Response(
        JSON.stringify({
          success: true,
          text: "",
          message: "Kein Text im Bild erkannt",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Extrahiere den Text
    if (
      visionData.responses &&
      visionData.responses[0] &&
      visionData.responses[0].fullTextAnnotation
    ) {
      const extractedText = visionData.responses[0].fullTextAnnotation.text;

      return new Response(
        JSON.stringify({
          success: true,
          text: extractedText,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } else {
      // Kein Text gefunden oder Fehler in der API-Antwort
      return new Response(
        JSON.stringify({
          success: true,
          text: "",
          message: "Kein Text im Bild gefunden oder API-Fehler",
          apiResponse: visionData, // Für Debug-Zwecke
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  } catch (error) {
    console.error("Fehler bei der OCR-Verarbeitung:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Bei der Textextraktion ist ein Fehler aufgetreten.",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
