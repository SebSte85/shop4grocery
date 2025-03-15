import React, { useState } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useCreateList } from "@/hooks/useLists";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-gesture-handler";

const SUPERMARKET_SUGGESTIONS = [
  "Aldi",
  "Lidl",
  "Rewe",
  "Edeka",
  "Kaufland",
  "Penny",
  "Netto",
  "Real",
  "Hit",
  "Globus",
];

export default function NewListScreen() {
  const router = useRouter();
  const createList = useCreateList();
  const [listName, setListName] = useState("");

  const handleCreate = async () => {
    if (!listName.trim()) return;

    try {
      await createList.mutateAsync({
        name: listName.trim(),
      });
      router.back();
    } catch (error) {
      console.error("Error creating list:", error);
    }
  };

  return (
    <View className="flex-1 bg-black-1 p-4">
      {/* Header */}
      <View className="flex-row items-center mb-8">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text variant="semibold" className="text-2xl">
          Neue Liste
        </Text>
      </View>

      {/* Store Icon */}
      <View className="items-center mb-8">
        <Image
          source={require("@/assets/images/store.png")}
          className="size-20"
          resizeMode="contain"
        />
      </View>

      {/* Input */}
      <TextInput
        value={listName}
        onChangeText={setListName}
        placeholder="Name der Liste"
        placeholderTextColor="#4A5568"
        className="bg-black-2 rounded-xl px-4 py-3 text-white mb-6 font-rubik-regular"
        autoFocus
      />

      {/* Suggestions */}
      <View className="mb-8">
        <Text variant="medium" className="mb-4">
          Vorschläge
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SUPERMARKET_SUGGESTIONS.map((store) => (
            <TouchableOpacity
              key={store}
              onPress={() => setListName(store)}
              className="px-4 py-2 rounded-full bg-[#1E2B49]"
            >
              <Text variant="medium" className="text-black-3">
                {store}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        onPress={handleCreate}
        disabled={!listName.trim()}
        className={`py-4 rounded-xl items-center ${
          listName.trim() ? "bg-primary-1" : "bg-black-2"
        }`}
      >
        <Text
          variant="semibold"
          className={listName.trim() ? "text-white" : "text-black-3"}
        >
          Liste erstellen
        </Text>
      </TouchableOpacity>
    </View>
  );
}
