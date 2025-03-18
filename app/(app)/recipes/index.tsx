import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Image, Alert, Platform } from "react-native";
import { Text } from "@/components/ui/Text";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useRouter, useFocusEffect } from "expo-router";
import { Button } from "@/components/ui/Button";

export default function RecipesScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset isLoading when screen is focused (when returning from another screen)
  useFocusEffect(
    React.useCallback(() => {
      console.log(
        "[DEBUG] RecipesScreen is focused, resetting isLoading state"
      );
      setIsLoading(false);
      return () => {
        // Cleanup function when screen is unfocused
      };
    }, [])
  );

  // Hilfsfunktion zum Kopieren des Bildes in einen sicheren, bekannten Pfad
  const copyImageToSafeLocation = async (uri: string): Promise<string> => {
    try {
      // Erstellen eines eindeutigen Dateinamens
      const fileName = `recipe-image-${new Date().getTime()}.jpg`;
      // Zielverzeichnis - wir verwenden den Dokumentenordner der App
      const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

      console.log(`Kopiere Bild von ${uri} nach ${destinationUri}`);

      // Kopieren der Datei
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri,
      });

      console.log(`Bild erfolgreich kopiert, neuer Pfad: ${destinationUri}`);
      return destinationUri;
    } catch (error) {
      console.error("Fehler beim Kopieren des Bildes:", error);
      // Wenn das Kopieren fehlschlägt, geben wir die Original-URI zurück
      return uri;
    }
  };

  const pickImage = async () => {
    // Frage nach Berechtigungen
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Berechtigung benötigt",
        "Wir benötigen Zugriff auf deine Medienbibliothek, um Rezeptbilder auszuwählen.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        console.log("Ausgewähltes Bild:", selectedImageUri);

        // Kopiere das Bild zu einem sicheren Ort
        const safeImageUri = await copyImageToSafeLocation(selectedImageUri);

        setImage(safeImageUri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Fehler",
        "Beim Auswählen des Bildes ist ein Fehler aufgetreten."
      );
    }
  };

  const takePhoto = async () => {
    // Frage nach Kamera-Berechtigungen
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Berechtigung benötigt",
        "Wir benötigen Zugriff auf deine Kamera, um Fotos von Rezepten aufzunehmen.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedImageUri = result.assets[0].uri;
        console.log("Aufgenommenes Foto:", capturedImageUri);

        // Kopiere das Bild zu einem sicheren Ort
        const safeImageUri = await copyImageToSafeLocation(capturedImageUri);

        setImage(safeImageUri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert(
        "Fehler",
        "Beim Aufnehmen des Fotos ist ein Fehler aufgetreten."
      );
    }
  };

  const resetImage = () => {
    setImage(null);
    setIsLoading(false); // Stelle sicher, dass isLoading zurückgesetzt wird
  };

  const analyzeRecipe = async () => {
    if (!image) return;

    setIsLoading(true);

    // Navigation zur Ergebnisseite mit dem Bild-URI als Parameter
    router.push({
      pathname: "/recipes/results",
      params: { imageUri: image },
    });
  };

  return (
    <View className="flex-1 bg-black-1">
      <View className="p-4">
        <Text variant="semibold" className="text-3xl text-primary-1">
          Rezepte Scan
        </Text>
        <Text variant="light" className="text-black-3 mt-1 font-rubik-semibold">
          Lade ein Foto deines Rezepts hoch
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="bg-black-2 rounded-xl p-6 mb-6">
          <Text variant="medium" className="mb-4 text-center">
            Lade ein Bild von deinem Rezept hoch und wir extrahieren die Zutaten
            für deine Einkaufsliste
          </Text>

          {image ? (
            <View className="items-center">
              <Image
                source={{ uri: image }}
                className="w-full h-64 rounded-lg mb-4"
                resizeMode="cover"
              />

              <View className="flex-row">
                <TouchableOpacity
                  onPress={resetImage}
                  className="bg-red-500 p-3 rounded-lg mr-2 flex-1"
                >
                  <Text variant="medium" className="text-white text-center">
                    Verwerfen
                  </Text>
                </TouchableOpacity>

                <Button
                  onPress={analyzeRecipe}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Analysieren
                </Button>
              </View>
            </View>
          ) : (
            <View>
              <TouchableOpacity
                onPress={pickImage}
                className="bg-black-1 p-4 rounded-lg mb-3 flex-row items-center justify-center"
              >
                <Ionicons
                  name="image"
                  size={24}
                  color="#8B5CF6"
                  className="mr-2"
                />
                <Text variant="medium" className="text-primary-1 ml-2">
                  Bild aus Galerie auswählen
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={takePhoto}
                className="bg-black-1 p-4 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons
                  name="camera"
                  size={24}
                  color="#8B5CF6"
                  className="mr-2"
                />
                <Text variant="medium" className="text-primary-1 ml-2">
                  Foto aufnehmen
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="bg-black-2 rounded-xl p-6 mb-6">
          <Text variant="medium" className="mb-2">
            Wie funktioniert's?
          </Text>
          <Text
            variant="light"
            className="text-black-3 mb-2 rubik-font-semibold"
          >
            1. Wähle ein Bild deines Rezepts aus oder mache ein Foto
          </Text>
          <Text
            variant="light"
            className="text-black-3 mb-2 rubik-font-semibold"
          >
            2. Unsere Texterkennung extrahiert die Zutaten
          </Text>
          <Text variant="light" className="text-black-3 rubik-font-semibold">
            3. Füge die Zutaten deiner Einkaufsliste hinzu
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
