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

      // Überprüfe, ob die aktuelle Zeile nur eine Menge und Einheit enthält (nächste Zeile wäre dann der Name)
      // Z.B. "100g" oder "100 g" alleine in einer Zeile
      const unitOnlyMatch = line.match(/^(\d+[\d\/\.,]*)\s*([a-zäöüßA-ZÄÖÜ]+)?$/);
      
      // Wenn die aktuelle Zeile nur Menge und Einheit enthält und es eine nächste Zeile gibt
      if (unitOnlyMatch && index < lines.length - 1) {
        const [_, quantity, possibleUnit] = unitOnlyMatch;
        // Nächste Zeile enthält vermutlich den Namen der Zutat
        const nextLine = lines[index + 1].trim();
        
        // Prüfe, ob die nächste Zeile nicht selbst eine Menge/Einheit ist
        const nextLineIsIngredient = !nextLine.match(/^(\d+[\d\/\.,]*)\s*([a-zäöüßA-ZÄÖÜ]+)?\s/);
        
        if (nextLineIsIngredient && !nextLine.match(/^[0-9]/)) {
          // Markiere die nächste Zeile zum Überspringen
          lines[index + 1] = ""; // Dies wird später durch den filter(Boolean) entfernt
          
          // Standardisiere die Einheit, wenn vorhanden
          const unit = possibleUnit ? standardizeUnit(possibleUnit) : detectUnitFromValue(quantity);
          
          return {
            id: `ingredient-${index}`,
            name: nextLine,
            quantity: quantity.trim(),
            unit: unit,
          };
        }
      }

      // Spezielle Vorverarbeitung für Fälle wie "1 gelbe Paprika"
      // Prüfe zuerst, ob die Zeile mit einer Zahl beginnt
      const numberMatch = line.match(/^(\d+[\d\/\.,]*)\s+(.+)$/);
      
      if (numberMatch) {
        const [_, quantity, rest] = numberMatch;
        
        // Verbesserte Erkennung von Einheiten, besonders für "g" und "kg"
        const unitMatch = rest.match(/^([a-zA-ZäöüÄÖÜß]+\.?)\s+(.+)$/);
        
        if (unitMatch) {
          // Wenn eine Einheit erkannt wurde
          const [_, possibleUnit, restWithUnit] = unitMatch;
          
          // Prüfe, ob es sich um eine bekannte Einheit handelt
          const knownUnits = ['g', 'gr', 'gramm', 'kg', 'ml', 'milliliter', 'l', 'liter', 
                              'el', 'EL', 'esslöffel', 'tl', 'TL', 'teelöffel', 'stück', 'stk', 'prise'];
          
          if (knownUnits.includes(possibleUnit.toLowerCase())) {
            // Es ist eine bekannte Einheit
            return {
              id: `ingredient-${index}`,
              name: restWithUnit.trim(),
              quantity: quantity.trim(),
              unit: standardizeUnit(possibleUnit),
            };
          } else {
            // Es ist keine bekannte Einheit, wahrscheinlich Teil des Namens wie "gelbe Paprika"
            // Verwende die gesamte Beschreibung nach der Zahl als Name
            return {
              id: `ingredient-${index}`,
              name: rest.trim(),
              quantity: quantity.trim(),
              unit: detectUnitFromValue(quantity), // Intelligentere Einheitenerkennung
            };
          }
        } else {
          // Spezialfall: Prüfe auf Gewichtsangaben ohne Leerzeichen, z.B. "100g Linsen"
          const weightMatch = rest.match(/^([a-zA-Z]+)(.+)$/);
          if (weightMatch) {
            const [_, possibleWeightUnit, nameAfterUnit] = weightMatch;
            if (['g', 'kg', 'ml', 'l'].includes(possibleWeightUnit.toLowerCase())) {
              return {
                id: `ingredient-${index}`,
                name: nameAfterUnit.trim(),
                quantity: quantity.trim(),
                unit: standardizeUnit(possibleWeightUnit),
              };
            }
          }
          
          // Keine Einheit gefunden, nur Zahl und Name
          return {
            id: `ingredient-${index}`,
            name: rest.trim(),
            quantity: quantity.trim(),
            unit: detectUnitFromValue(quantity), // Intelligentere Einheitenerkennung
          };
        }
      }

      // Fallback zum komplexeren Regex-Ansatz für andere Fälle
      const regex = /^((?:\d+[\d\/\.,]*\s*[-–]?\s*\d*\/?\d*)|(?:\d*\/\d+))?\s*([a-zA-ZäöüÄÖÜß]+(\.|\s|$)?)?\s*(.+)$/;
      const match = line.match(regex);

      if (match) {
        let [_, quantity, unit, name] = match;
        
        // Wenn kein Name erkannt wurde, könnte der letzte Teil der Einheit der Name sein
        if (!name && unit) {
          const parts = unit.split(' ');
          if (parts.length > 1) {
            unit = parts[0];
            name = parts.slice(1).join(' ');
          }
        }

        // Normalisiere die Einheit
        if (unit) {
          unit = standardizeUnit(unit);
        } else if (quantity) {
          // Wenn keine Einheit erkannt wurde, versuche eine zu ermitteln
          unit = detectUnitFromValue(quantity);
        }

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

// Neue Hilfsfunktion zur Erkennung von Einheiten anhand des Werts
function detectUnitFromValue(value: string): string {
  if (!value) return "Stück";
  
  // Wenn der Wert kleiner als 10 ist, handelt es sich wahrscheinlich um Stücke
  const numValue = parseFloat(value.replace(',', '.'));
  
  if (isNaN(numValue)) return "Stück";
  
  // Bei kleinen ganzen Zahlen (1-5) nehmen wir meist "Stück" an
  if (numValue <= 5 && Number.isInteger(numValue)) {
    return "Stück";
  }
  
  // Bei größeren Zahlen (> 10) oder Dezimalzahlen nehmen wir eher Gewicht an
  if (numValue > 10 || !Number.isInteger(numValue)) {
    return "g";
  }
  
  // Im Zweifelsfall Stück
  return "Stück";
}

// Hilfsfunktion zur Standardisierung von Einheiten
function standardizeUnit(unit: string): string {
  if (!unit) return "";
  
  unit = unit.trim().replace(/\.$/, '');
  
  // Standardisiere Einheiten
  const unitMap: Record<string, string> = {
    'g': 'g',
    'gr': 'g',
    'gramm': 'g',
    'kg': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'l': 'l',
    'liter': 'l',
    'el': 'EL',
    'EL': 'EL',
    'esslöffel': 'EL',
    'tl': 'TL',
    'TL': 'TL',
    'teelöffel': 'TL',
    'stück': 'Stück',
    'stk': 'Stück',
    'prise': 'Prise',
  };
  
  return unitMap[unit.toLowerCase()] || unit;
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
