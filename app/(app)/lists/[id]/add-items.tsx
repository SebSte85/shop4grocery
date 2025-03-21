import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  useItems,
  useAddItemToList,
  useCreateCustomItem,
} from "@/hooks/useItems";
import { ItemSelector } from "@/components/lists/ItemSelector";
import { Ionicons } from "@expo/vector-icons";
import { Item } from "@/types/database.types";
import { useCategories, guessCategoryForItem } from "@/hooks/useCategories";

export default function AddItemsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const { data: items, isLoading } = useItems(debouncedSearchText);
  const addItemToList = useAddItemToList();
  const createCustomItem = useCreateCustomItem();
  const inputRef = useRef<TextInput>(null);
  const { data: categories } = useCategories();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Animation values
  const toastAnimation = useRef(new Animated.Value(-100)).current;

  const [selectedItems, setSelectedItems] = useState<
    Record<string, { quantity: number; notes?: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  // Debounce-Effekt für die Suche
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 800); // 800ms Verzögerung für eine bessere Benutzererfahrung

    return () => {
      clearTimeout(handler);
    };
  }, [searchText]);

  // Toast-Animation
  useEffect(() => {
    if (toastMessage) {
      // Animate in
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Set timeout to animate out
      const timer = setTimeout(() => {
        Animated.timing(toastAnimation, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setToastMessage(null);
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [toastMessage, toastAnimation]);

  // Prüfen, ob ein neues Item erstellt werden kann
  const newItemExists = useMemo(() => {
    if (!searchText.trim() || !items) return false;
    return !items.some(
      (item) => item.name.toLowerCase() === searchText.trim().toLowerCase()
    );
  }, [searchText, items]);

  // Virtuelles Item für die Anzeige
  const virtualNewItem: Item | null = useMemo(() => {
    if (!newItemExists || !searchText.trim()) return null;

    // Guess category for new item
    const categoryName = guessCategoryForItem(searchText.trim());
    const category = categories?.find((cat) => cat.name === categoryName);

    return {
      id: "new-item-temp",
      name: searchText.trim(),
      is_popular: false,
      created_at: new Date().toISOString(),
      created_by: "",
      is_custom: true,
      category_id: category?.id,
      category: category,
    };
  }, [newItemExists, searchText, categories]);

  // Funktion zum Anzeigen eines Toasts
  const showToast = (message: string) => {
    setToastMessage(message);
  };

  const handleSelectItem = (item: Item) => {
    // Ignoriere Klicks auf das virtuelle neue Item
    if (item.id === "new-item-temp") {
      return;
    }

    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (newItems[item.id]) {
        delete newItems[item.id];
      } else {
        newItems[item.id] = { quantity: 1 };
      }
      return newItems;
    });
  };

  const handleAddItems = async () => {
    try {
      setError(null);
      const promises = Object.entries(selectedItems).map(([itemId, details]) =>
        addItemToList.mutateAsync({
          listId: id,
          itemId,
          quantity: details.quantity,
          notes: details.notes,
        })
      );

      await Promise.all(promises);

      // Zeige Toast an
      const itemCount = Object.keys(selectedItems).length;
      showToast(`${itemCount} Artikel hinzugefügt`);

      // Clear selected items
      setSelectedItems({});
    } catch (err: any) {
      // Check if the error is about the item limit
      if (err.message?.includes("Limit erreicht")) {
        Alert.alert(
          "Limit erreicht",
          "Du hast das Maximum von 25 Items für kostenlose Nutzer erreicht. Upgrade auf Premium im Profilbereich für unbegrenzte Items.",
          [
            {
              text: "Abbrechen",
              style: "cancel",
            },
            {
              text: "Zum Profil",
              onPress: () => {
                router.replace("/(app)/profile");
              },
            },
          ]
        );
      } else {
        setError(
          "Fehler beim Hinzufügen der Items. Bitte versuchen Sie es erneut."
        );
      }
    }
  };

  const handleCreateItem = async () => {
    if (!searchText.trim()) {
      return;
    }

    try {
      setError(null);
      Keyboard.dismiss(); // Tastatur ausblenden

      // Suchtext leeren, bevor die API-Aufrufe starten
      const itemNameToCreate = searchText.trim();

      // Guess category for new item
      const categoryName = guessCategoryForItem(itemNameToCreate);
      const category = categories?.find((cat) => cat.name === categoryName);

      setSearchText("");
      setDebouncedSearchText("");

      const newItem = await createCustomItem.mutateAsync({
        name: itemNameToCreate,
        categoryId: category?.id,
      });

      // Füge das Item direkt zur Liste hinzu
      try {
        await addItemToList.mutateAsync({
          listId: id,
          itemId: newItem.id,
          quantity: 1,
        });

        // Zeige Toast an
        showToast(`${itemNameToCreate} hinzugefügt`);

        // Nach kurzer Verzögerung Tastatur wieder anzeigen
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      } catch (err: any) {
        // Check if the error is about the item limit
        if (err.message?.includes("Limit erreicht")) {
          Alert.alert(
            "Limit erreicht",
            "Du hast das Maximum von 25 Items für kostenlose Nutzer erreicht. Upgrade auf Premium im Profilbereich für unbegrenzte Items.",
            [
              {
                text: "Abbrechen",
                style: "cancel",
              },
              {
                text: "Zum Profil",
                onPress: () => {
                  router.replace("/(app)/profile");
                },
              },
            ]
          );
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Fehler beim Erstellen des Items. Bitte versuchen Sie es erneut."
      );
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black-1 justify-center items-center">
        <Text className="text-white font-rubik">Laden...</Text>
      </View>
    );
  }

  // Kombinierte Liste aus vorhandenen Items und dem virtuellen neuen Item
  const displayItems = virtualNewItem
    ? [...(items || []), virtualNewItem]
    : items || [];

  // Prüfen, ob der "Hinzufügen"-Button angezeigt werden soll
  const showAddButton = searchText.trim().length > 0 && newItemExists;

  return (
    <View className="flex-1 bg-black-1">
      {/* Toast Notification */}
      {toastMessage && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: "#B23FFF",
              padding: 16,
              zIndex: 100,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
              transform: [{ translateY: toastAnimation }],
            },
          ]}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-rubik-medium">{toastMessage}</Text>
            <TouchableOpacity
              onPress={() => {
                Animated.timing(toastAnimation, {
                  toValue: -100,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => setToastMessage(null));
              }}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View className="p-4 flex-row items-center border-b border-black-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center bg-black-2 rounded-lg px-4 py-2">
          <TextInput
            ref={inputRef}
            className="flex-1 text-white font-rubik"
            placeholder="Artikel"
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleCreateItem}
            autoFocus={true}
            blurOnSubmit={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="ml-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {!debouncedSearchText && (
          <View className="px-4 pt-4">
            <Text className="text-primary-1 font-rubik-semibold text-lg mb-4">
              DEINE HÄUFIGSTEN ITEMS
            </Text>
          </View>
        )}

        {debouncedSearchText && virtualNewItem && (
          <View className="px-4 pt-4">
            <Text className="text-primary-1 font-rubik text-lg mb-4">
              NEUES ITEM
            </Text>
          </View>
        )}

        <View>
          {displayItems.map((item) => (
            <ItemSelector
              key={item.id}
              item={item}
              isSelected={!!selectedItems[item.id]}
              onSelect={handleSelectItem}
              isNewItem={item.id === "new-item-temp"}
              isClickable={item.id !== "new-item-temp"}
            />
          ))}
        </View>

        {error && (
          <Text className="text-attention text-sm text-center mt-4">
            {error}
          </Text>
        )}
      </ScrollView>

      {/* Add New Item Button */}
      {showAddButton && (
        <View className="absolute bottom-4 right-4">
          <TouchableOpacity
            onPress={handleCreateItem}
            className="bg-primary-1 w-14 h-14 rounded-full items-center justify-center"
          >
            <Ionicons
              name="checkmark-sharp"
              size={30}
              color="white"
              weight="bold"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Add Selected Items Button */}
      {Object.keys(selectedItems).length > 0 && !showAddButton && (
        <View className="absolute bottom-4 right-4">
          <TouchableOpacity
            onPress={handleAddItems}
            className="bg-primary-1 w-14 h-14 rounded-full items-center justify-center"
          >
            <Ionicons
              name="checkmark-sharp"
              size={30}
              color="white"
              weight="bold"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
