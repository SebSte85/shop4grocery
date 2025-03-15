import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  useItems,
  useAddItemToList,
  useCreateCustomItem,
} from "@/hooks/useItems";
import { ItemSelector } from "@/components/lists/ItemSelector";
import { Ionicons } from "@expo/vector-icons";
import { Item } from "@/types/database.types";

export default function AddItemsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [searchText, setSearchText] = useState("");
  const { data: items, isLoading } = useItems(searchText);
  const addItemToList = useAddItemToList();
  const createCustomItem = useCreateCustomItem();

  const [selectedItems, setSelectedItems] = useState<
    Record<string, { quantity: number; notes?: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  const handleSelectItem = (item: Item) => {
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
      router.back();
    } catch (err) {
      setError(
        "Fehler beim Hinzufügen der Items. Bitte versuchen Sie es erneut."
      );
    }
  };

  const handleCreateItem = async () => {
    if (!searchText.trim()) {
      return;
    }

    try {
      setError(null);
      const newItem = await createCustomItem.mutateAsync({
        name: searchText,
      });
      setSearchText("");
      handleSelectItem(newItem);
    } catch (err) {
      setError(
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

  return (
    <View className="flex-1 bg-black-1">
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
            className="flex-1 text-white font-rubik"
            placeholder="Artikel"
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleCreateItem}
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
      <ScrollView className="flex-1">
        {!searchText && (
          <View className="px-4 pt-4">
            <Text className="text-primary-1 font-rubik text-lg mb-4">
              POPULÄR
            </Text>
          </View>
        )}

        <View>
          {items?.map((item) => (
            <ItemSelector
              key={item.id}
              item={item}
              isSelected={!!selectedItems[item.id]}
              onSelect={handleSelectItem}
            />
          ))}
        </View>

        {error && (
          <Text className="text-attention text-sm text-center mt-4">
            {error}
          </Text>
        )}
      </ScrollView>

      {/* Add Button */}
      {searchText.trim().length > 0 &&
        !items?.some(
          (item) => item.name.toLowerCase() === searchText.trim().toLowerCase()
        ) && (
          <View className="absolute bottom-4 right-4">
            <TouchableOpacity
              onPress={handleCreateItem}
              className="bg-primary-1 w-14 h-14 rounded-full items-center justify-center"
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}

      {/* Add Selected Items Button */}
      {Object.keys(selectedItems).length > 0 && (
        <View className="absolute bottom-4 right-4">
          <TouchableOpacity
            onPress={handleAddItems}
            className="bg-primary-1 w-14 h-14 rounded-full items-center justify-center"
          >
            <Ionicons name="checkmark" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
