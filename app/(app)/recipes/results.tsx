import React, { useState, useEffect } from "react";
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
      console.log("[DEBUG-Results] Starte OCR-Prozess mit Bild:", imageUri);
      extractTextFromImage(imageUri)
        .then((extractedText) => {
          console.log(
            "[DEBUG-Results] OCR-Extraktion abgeschlossen, Text gefunden:",
            !!extractedText,
            "Länge:",
            extractedText?.length || 0
          );
          if (extractedText) {
            setError(null);
            setLoading(false);
            const ingredients = extractIngredientsFromText(extractedText);
            console.log(
              "[DEBUG-Results] Zutaten extrahiert:",
              ingredients.length
            );
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
          console.log("[DEBUG-Results] OCR-Prozess abgeschlossen");
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
    bottomSheetModalRef.current?.present();
  };

  const handleAddToList = async () => {
    if (!selectedListId) {
      Alert.alert("Fehler", "Bitte wähle eine Liste aus.");
      return;
    }

    const selectedIngredients = ingredients.filter((i) => i.selected);

    if (selectedIngredients.length === 0) {
      Alert.alert(
        "Keine Zutaten ausgewählt",
        "Bitte wähle mindestens eine Zutat aus."
      );
      return;
    }

    setIsAddingToList(true);

    try {
      const addPromises = selectedIngredients.map(async (ingredient) => {
        try {
          const itemName = ingredient.name;
          let unitText = "";

          if (ingredient.quantity && ingredient.unit) {
            unitText = `(${ingredient.quantity} ${ingredient.unit})`;
          } else if (ingredient.quantity) {
            unitText = `(${ingredient.quantity})`;
          }

          const fullItemName = unitText ? `${itemName} ${unitText}` : itemName;

          const categoryName = categories?.find((cat) =>
            itemName.toLowerCase().includes(cat.name.toLowerCase())
          );

          const newItem = await createCustomItem.mutateAsync({
            name: fullItemName,
            categoryId: categoryName?.id,
          });

          await addItemToList.mutateAsync({
            listId: selectedListId,
            itemId: newItem.id,
            quantity: 1,
          });

          return true;
        } catch (error) {
          console.error("Fehler beim Hinzufügen der Zutat:", error);
          return false;
        }
      });

      await Promise.all(addPromises);

      setIsAddingToList(false);
      bottomSheetModalRef.current?.close();

      Alert.alert(
        "Zutaten hinzugefügt",
        `${selectedIngredients.length} Zutaten wurden zur Liste hinzugefügt.`,
        [
          {
            text: "OK",
            onPress: () => {
              router.push(`/lists/${selectedListId}`);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Zutaten:", error);
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
                  className="bg-black-2 py-2 px-4 rounded-lg"
                >
                  <Text variant="medium" className="text-primary-1">
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
                      <Text variant="medium">{ingredient.name}</Text>
                      {ingredient.quantity && (
                        <Text variant="light" className="text-black-3">
                          {ingredient.quantity} {ingredient.unit}
                        </Text>
                      )}
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
                    onPress={openListSelector}
                    className="bg-primary-1 h-14 rounded-xl w-full flex-row justify-center items-center"
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

        {/* Bottom Sheet für Listenauswahl */}
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={["50%"]}
          backgroundStyle={{ backgroundColor: "#011A38" }}
          handleIndicatorStyle={{ backgroundColor: "#64748B" }}
        >
          <View className="flex-1 p-4">
            <Text variant="semibold" className="text-xl mb-4">
              Liste auswählen
            </Text>

            {listsLoading ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <>
                <ScrollView className="flex-1">
                  {lists && lists.length > 0 ? (
                    lists.map((list) => (
                      <TouchableOpacity
                        key={list.id}
                        onPress={() => setSelectedListId(list.id)}
                        className={`p-4 mb-2 rounded-xl flex-row items-center justify-between ${
                          selectedListId === list.id
                            ? "bg-primary-1/10"
                            : "bg-black-2"
                        }`}
                      >
                        <Text variant="medium">{list.name}</Text>
                        {selectedListId === list.id && (
                          <Ionicons
                            name="checkmark"
                            size={24}
                            color="#8B5CF6"
                          />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text variant="medium" className="text-center text-black-3">
                      Keine Listen vorhanden
                    </Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  onPress={handleAddToList}
                  className="bg-primary-1 p-4 rounded-xl mt-4"
                  disabled={isAddingToList}
                >
                  {isAddingToList ? (
                    <View className="flex-row justify-center items-center">
                      <ActivityIndicator size="small" color="white" />
                      <Text variant="medium" className="text-white ml-2">
                        Wird hinzugefügt...
                      </Text>
                    </View>
                  ) : (
                    <Text variant="medium" className="text-white text-center">
                      Hinzufügen
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
}
