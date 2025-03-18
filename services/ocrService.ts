import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase"; // Importiere den Supabase Client

// Definiert Typen für die zurückgegebenen Zutaten
export interface ExtractedIngredient {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
}

// URL der Supabase Edge Function
const SUPABASE_FUNCTION_URL = "https://eekoxtwazxjmjzaqtotg.supabase.co/functions/v1/ocr";

// Hauptfunktion zur Extraktion von Text aus einem Bild
export async function extractTextFromImage(imageUri: string): Promise<string> {
  try {
    console.log("[OCR Debug] Starte OCR-Prozess mit URI:", imageUri);
    // Bei Expo müssen wir das Bild zuerst als Base64 einlesen
    let base64Image: string | null = null;

    if (Platform.OS === "web") {
      // Base64-Encodierung für Web
      console.log("[OCR Debug] Web-Plattform erkannt - konvertiere Bild");
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      base64Image = base64.split(",")[1]; // Entferne den Data-URL-Präfix
      console.log("[OCR Debug] Web-Bild in Base64 konvertiert, Länge:", base64Image?.length || 0);
    } else {
      try {
        console.log("[OCR Debug] Mobile Plattform erkannt - lese Bilddatei:", imageUri);
        // Base64-Encodierung für mobile Plattformen mit Expo FileSystem
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log("[OCR Debug] Mobile Bild in Base64 konvertiert, Länge:", base64Image?.length || 0);
      } catch (error: any) {
        console.error("[OCR Debug] Fehler beim Lesen der Bilddatei:", error.message);
        throw new Error(`Fehler beim Lesen der Bilddatei: ${error.message}`);
      }
    }

    // Wenn wir kein Bild haben, werfen wir einen Fehler
    if (!base64Image) {
      console.error("[OCR Debug] Kein Base64-Bild vorhanden");
      throw new Error("Kein Bild zum Verarbeiten");
    }

    // Sendet Anfrage direkt an die Supabase Edge Function
    console.log("[OCR Debug] Rufe OCR-Edge-Function auf - Bildgröße:", base64Image.length, "Zeichen");
    console.log("[OCR Debug] Verwende Funktionsname: 'ocr'");
    
    // Verwende den Supabase-Client für den Funktionsaufruf
    console.log("[OCR Debug] Vor Edge Function invoke");
    const { data, error } = await supabase.functions.invoke('ocr', {
      body: { image: base64Image }
    });
    console.log("[OCR Debug] Nach Edge Function invoke - Antwort erhalten:", !!data, "Fehler:", !!error);
    
    if (error) {
      console.error("[OCR Debug] Edge Function Fehler:", error.message, error);
      throw new Error(`Edge Function Fehler: ${error.message}`);
    }
    
    if (!data || !data.success) {
      console.error("[OCR Debug] Fehler in der OCR-Verarbeitung:", data?.error || "Unbekannter Fehler", data);
      throw new Error(data?.error || "Fehler bei der OCR-Verarbeitung");
    }

    if (!data.text) {
      console.warn("[OCR Debug] Kein Text erkannt - Vollständige Antwort:", JSON.stringify(data));
      return "";
    }

    console.log("[OCR Debug] Text erfolgreich extrahiert, Länge:", data.text.length);
    return data.text;
  } catch (error) {
    console.error("Fehler bei der OCR-Verarbeitung:", error);

    // Gib eine detailliertere Fehlermeldung zurück
    if (error instanceof Error) {
      throw new Error(`OCR-Verarbeitung fehlgeschlagen: ${error.message}`);
    } else {
      throw new Error("OCR-Verarbeitung fehlgeschlagen: Unbekannter Fehler");
    }
  }
}

// Funktion zur Extraktion von Zutaten aus dem erkannten Text
export function extractIngredientsFromText(
  text: string
): ExtractedIngredient[] {
  // Prüfe, ob der Text leer ist
  if (!text || text.trim() === "") {
    return [];
  }

  // Teile den Text in Zeilen
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  // Versuche, den Zutatenbereich zu identifizieren
  const ingredientsIndex = findIngredientsSection(lines);

  if (ingredientsIndex.start < 0) {
    // Wenn kein expliziter Zutatenbereich gefunden wird, verwende alle Zeilen
    return parseIngredientLines(lines);
  }

  // Verwende nur die Zeilen aus dem Zutatenbereich
  const ingredientLines = lines.slice(
    ingredientsIndex.start,
    ingredientsIndex.end
  );
  return parseIngredientLines(ingredientLines);
}

// Findet den Bereich im Text, der die Zutaten enthält
function findIngredientsSection(lines: string[]): {
  start: number;
  end: number;
} {
  let start = -1;
  let end = lines.length;

  // Suche nach gängigen Überschriften für Zutaten
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (
      line.includes("zutaten") ||
      line.includes("zutaten:") ||
      line.includes("ingredients")
    ) {
      start = i + 1; // Beginne nach der Überschrift
    } else if (
      start >= 0 &&
      (line.includes("zubereitung") ||
        line.includes("anleitung") ||
        line.includes("instructions") ||
        line.startsWith("1.") ||
        line.includes("schritt"))
    ) {
      end = i;
      break;
    }
  }

  return { start, end };
}

// Parst die Zutatenzeilen und extrahiert strukturierte Daten
function parseIngredientLines(lines: string[]): ExtractedIngredient[] {
  return lines
    .map((line, index) => {
      // Entferne Aufzählungszeichen oder Nummern am Anfang
      line = line.replace(/^[\-•*]\s*/, "").trim();

      // Ignoriere leere Zeilen und offensichtliche Überschriften
      if (
        line === "" ||
        line.toLowerCase().includes("zutaten") ||
        line.toLowerCase().includes("ingredients")
      ) {
        return null;
      }

      // Regulärer Ausdruck für deutsche Zutatenformate
      // Erkennt:
      // - Zahlen (auch mit Dezimalpunkt oder Komma)
      // - Brüche (1/2, 3/4, etc.)
      // - Maßeinheiten (g, kg, ml, l, EL, TL, Prise, Stück, etc.)
      // - Den Rest als Zutatennamen
      const regex =
        /^((?:\d+[\d\/\.,]*\s*[-–]?\s*\d*\/?\d*)|(?:\d*\/\d+))?\s*([a-zA-ZäöüÄÖÜß]+\.?)?\s*(.+)$/;

      const match = line.match(regex);

      if (match) {
        const [_, quantity, unit, name] = match;

        // Entferne "Optional:" oder ähnliche Präfixe vom Namen
        let cleanName = name?.trim() || line.trim();
        if (cleanName.toLowerCase().startsWith("optional:")) {
          cleanName = cleanName.substring(9).trim();
        }

        return {
          id: `ingredient-${index}`,
          name: cleanName,
          quantity: quantity?.trim(),
          unit: unit?.trim(),
        };
      }

      // Fallback, wenn das Regex nicht passt
      return {
        id: `ingredient-${index}`,
        name: line.trim(),
      };
    })
    .filter(Boolean) as ExtractedIngredient[]; // Filtere null-Werte
}

// Hilfsfunktion zur Umwandlung eines Blobs in Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Simuliert eine Antwort von der Vision API für Entwicklungszwecke
function simulateVisionAPIResponse(): string {
  // Beispiel für einen erkannten Text aus einem Rezept
  return `ZUTATEN:
250g Mehl
100g Zucker
1 Päckchen Backpulver
2 Eier
125ml Milch
80g Butter
1 Prise Salz
1 Päckchen Vanillezucker
Optional: 100g Schokoladenstückchen

ZUBEREITUNG:
1. Ofen auf 180°C vorheizen.
2. Alle trockenen Zutaten vermischen.
3. Eier, Milch und geschmolzene Butter dazugeben und gut verrühren.
4. Teig in eine gefettete Form geben.
5. 30-35 Minuten backen.`;
}
