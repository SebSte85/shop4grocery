import React, { useState, useEffect, useCallback } from "react";
import { View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/Text";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useLists } from "@/hooks/useLists";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { useRef } from "react";
import {
  extractTextFromImage,
  extractIngredientsFromText,
  ExtractedIngredient,
} from "@/services/ocrService";
import { useAddItemToList, useCreateCustomItem } from "@/hooks/useItems";
import { useCategories } from "@/hooks/useCategories";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { ListSelectorBottomSheet } from "@/components/recipes/ListSelectorBottomSheet";

export default function RecipeResultsScreen() {
  const router = useRouter();
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<
    (ExtractedIngredient & { selected: boolean })[]
  >([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const { data: lists, isLoading: listsLoading } = useLists();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const addItemToList = useAddItemToList();
  const createCustomItem = useCreateCustomItem();
  const { data: categories } = useCategories();

  useEffect(() => {
    if (imageUri) {
      extractTextFromImage(imageUri)
        .then((extractedText) => {
          if (extractedText) {
            setError(null);
            setLoading(false);
            const ingredients = extractIngredientsFromText(extractedText);

            const ingredientsWithSelection = ingredients.map((ingredient) => ({
              ...ingredient,
              selected: false,
            }));
            setIngredients(ingredientsWithSelection);
          } else {
            console.warn("[DEBUG-Results] Kein Text extrahiert");
            setError("Kein Text im Bild erkannt");
            setLoading(false);
          }
        })
        .catch((error) => {
          console.error(
            "[DEBUG-Results] Fehler bei der OCR-Verarbeitung:",
            error
          );
          setError(error.message || "Fehler bei der OCR-Verarbeitung");
          setLoading(false);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [imageUri]);

  const toggleIngredient = (id: string) => {
    setIngredients(
      ingredients.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllIngredients = () => {
    setIngredients(ingredients.map((item) => ({ ...item, selected: true })));
  };

  const deselectAllIngredients = () => {
    setIngredients(ingredients.map((item) => ({ ...item, selected: false })));
  };

  const openListSelector = () => {
    if (bottomSheetModalRef.current) {
      // Mit animate:true Option aufrufen, um Probleme mit "Reduced Motion" zu umgehen
      bottomSheetModalRef.current.present({ animate: true });
    } else {
      console.error("[DEBUG] BottomSheet Ref ist null");
    }
  };

  const handleAddToList = async () => {
    if (!selectedListId) {
      Alert.alert("Fehler", "Bitte wähle eine Liste aus.");
      return;
    }

    const selectedIngredients = ingredients.filter((i) => i.selected);
    console.log("[DEBUG] Ausgewählte Zutaten:", selectedIngredients.length);

    if (selectedIngredients.length === 0) {
      Alert.alert(
        "Keine Zutaten ausgewählt",
        "Bitte wähle mindestens eine Zutat aus."
      );
      return;
    }

    setIsAddingToList(true);

    try {
      const addPromises = selectedIngredients.map(async (ingredient, index) => {
        try {
          console.log(
            `[DEBUG] Verarbeite Zutat ${index + 1}:`,
            ingredient.name
          );
          const itemName = ingredient.name;

          // Direkter Itemname ohne Klammern
          const fullItemName = itemName;
          console.log(`[DEBUG] Vollständiger Itemname: ${fullItemName}`);

          const categoryName = categories?.find((cat) =>
            itemName.toLowerCase().includes(cat.name.toLowerCase())
          );
          console.log(
            `[DEBUG] Gefundene Kategorie:`,
            categoryName?.name || "keine"
          );

          console.log(`[DEBUG] Erstelle neues Item: ${fullItemName}`);
          const newItem = await createCustomItem.mutateAsync({
            name: fullItemName,
            categoryId: categoryName?.id,
          });
          console.log(`[DEBUG] Item erstellt, ID: ${newItem.id}`);

          console.log(`[DEBUG] Füge Item zur Liste hinzu: ${selectedListId}`);
          await addItemToList.mutateAsync({
            listId: selectedListId,
            itemId: newItem.id,
            quantity: ingredient.quantity ? Number(ingredient.quantity) : 1,
            unit: ingredient.unit || "Stück",
            notes: ingredient.unit
              ? `Erkannt als: ${ingredient.quantity} ${ingredient.unit}`
              : "",
          });
          console.log(`[DEBUG] Item erfolgreich zur Liste hinzugefügt`);

          return true;
        } catch (error) {
          console.error(
            `[DEBUG] Fehler beim Hinzufügen der Zutat ${ingredient.name}:`,
            error
          );
          return false;
        }
      });

      console.log("[DEBUG] Warte auf alle Promises");
      const results = await Promise.all(addPromises);
      console.log("[DEBUG] Ergebnisse:", results);
      const successCount = results.filter(Boolean).length;
      console.log(
        `[DEBUG] ${successCount} von ${selectedIngredients.length} Zutaten erfolgreich hinzugefügt`
      );

      // Entferne hinzugefügte Items aus der Liste
      const selectedIds = selectedIngredients.map((item) => item.id);

      // Prüfe, ob alle Items ausgewählt wurden
      const allItemsSelected =
        ingredients.length === selectedIngredients.length;

      setIngredients((prevIngredients) =>
        prevIngredients.filter((item) => !selectedIds.includes(item.id))
      );

      setIsAddingToList(false);
      bottomSheetModalRef.current?.close();

      // Setze die Auswahl zurück
      setSelectedListId(null);

      // Wenn alle Items hinzugefügt wurden, zurück zur Hauptseite navigieren
      if (allItemsSelected) {
        console.log(
          "[DEBUG] Alle Items wurden hinzugefügt, navigiere zurück zur Hauptseite"
        );
        setTimeout(() => {
          router.replace("/");
        }, 300);
      }
    } catch (error) {
      console.error("[DEBUG] Fehler beim Hinzufügen der Zutaten:", error);
      setIsAddingToList(false);

      Alert.alert(
        "Fehler",
        "Beim Hinzufügen der Zutaten ist ein Fehler aufgetreten. Bitte versuche es erneut."
      );
    }
  };

  const selectedCount = ingredients.filter((i) => i.selected).length;

  return (
    <BottomSheetModalProvider>
      <View className="flex-1 bg-black-1">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text variant="semibold" className="text-3xl text-primary-1">
              Erkannte Zutaten
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text variant="medium" className="mt-4">
              Zutaten werden analysiert...
            </Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center p-4">
            <Ionicons name="alert-circle" size={48} color="#F87171" />
            <Text variant="medium" className="mt-4 text-center">
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-8 bg-primary-1 p-3 rounded-lg px-6"
            >
              <Text variant="medium" className="text-white">
                Zurück
              </Text>
            </TouchableOpacity>
          </View>
        ) : ingredients.length === 0 ? (
          <View className="flex-1 items-center justify-center p-4">
            <Ionicons name="document-text" size={48} color="#64748B" />
            <Text variant="medium" className="mt-4 text-center">
              Keine Zutaten erkannt
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-8 bg-primary-1 p-3 rounded-lg px-6"
            >
              <Text variant="medium" className="text-white">
                Zurück
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Zutaten Liste */}
            <ScrollView className="flex-1 px-4">
              <View className="flex-row justify-between mb-4">
                <TouchableOpacity
                  onPress={selectAllIngredients}
                  className="bg-primary-1/20 py-2 px-4 rounded-lg flex-row items-center"
                >
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text variant="medium" className="text-primary-1 ml-2">
                    Alle auswählen
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={deselectAllIngredients}
                  className="bg-black-2 py-2 px-4 rounded-lg"
                >
                  <Text variant="medium" className="text-black-3">
                    Alle abwählen
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Shortcut Button: Alle auswählen und zur Liste */}
              <TouchableOpacity
                onPress={() => {
                  selectAllIngredients();
                  // Kurze Verzögerung, damit die UI-Aktualisierung sichtbar ist
                  setTimeout(() => {
                    openListSelector();
                  }, 100);
                }}
                className="bg-primary-1/10 p-4 rounded-xl mb-4 flex-row items-center justify-center"
              >
                <Ionicons name="flash" size={22} color="#8B5CF6" />
                <Text variant="medium" className="text-primary-1 ml-2">
                  Alle Zutaten direkt zur Liste hinzufügen
                </Text>
              </TouchableOpacity>

              <View className="space-y-2 mb-20">
                {ingredients.map((ingredient) => (
                  <TouchableOpacity
                    key={ingredient.id}
                    onPress={() => toggleIngredient(ingredient.id)}
                    className={`p-4 rounded-xl flex-row items-center justify-between ${
                      ingredient.selected ? "bg-primary-1/10" : "bg-black-2"
                    }`}
                  >
                    <View className="flex-1">
                      <Text variant="semibold" className="text-lg">
                        {ingredient.name}
                      </Text>
                      <Text variant="light" className="text-black-3 mt-1">
                        {ingredient.quantity || ""} {ingredient.unit || ""}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        ingredient.selected
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={24}
                      color={ingredient.selected ? "#8B5CF6" : "#64748B"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Action */}
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-black-1">
              <View className="flex-row items-center">
                <View className="flex-1 mr-3">
                  <TouchableOpacity
                    onPress={() => {
                      console.log(
                        "[DEBUG] Button gedrückt, versuche Sheet zu öffnen"
                      );
                      openListSelector();
                    }}
                    className={`bg-primary-1 h-14 rounded-xl w-full flex-row justify-center items-center ${
                      selectedCount === 0 ? "opacity-50" : ""
                    }`}
                    disabled={selectedCount === 0}
                  >
                    <Text
                      variant="semibold"
                      className="uppercase text-white mr-3"
                    >
                      Zu Liste hinzufügen ({selectedCount})
                    </Text>
                    <Ionicons name="add-circle" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Bottom Sheet für Listenauswahl - Jetzt als eigene Komponente */}
        <ListSelectorBottomSheet
          bottomSheetRef={bottomSheetModalRef}
          lists={lists}
          listsLoading={listsLoading}
          selectedListId={selectedListId}
          setSelectedListId={setSelectedListId}
          isAddingToList={isAddingToList}
          onAddToList={handleAddToList}
        />
      </View>
    </BottomSheetModalProvider>
  );
}
