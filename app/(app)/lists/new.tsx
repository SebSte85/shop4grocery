import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { useCreateList } from "@/hooks/useLists";
import { useState } from "react";
import { SupermarketSelector } from "@/components/lists/SupermarketSelector";
import { Ionicons } from "@expo/vector-icons";

export default function NewListScreen() {
  const router = useRouter();
  const createList = useCreateList();
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      await createList.mutateAsync({ name: name.trim() });
      router.back();
    } catch (error) {
      console.error("Error creating list:", error);
    }
  };

  return (
    <View className="flex-1 bg-black-1">
      {/* Header */}
      <View className="flex-row items-center p-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text variant="semibold" className="text-3xl text-primary-1">
          Neue Liste
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 px-4">
        <Input
          placeholder="Name der Liste"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <SupermarketSelector onSelect={setName} />
      </View>

      {/* Bottom Button */}
      <View className="px-4 pb-8">
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim()}
          className="bg-primary-1 p-4 rounded-xl items-center"
        >
          <Text variant="semibold" className="uppercase text-white">
            LISTE ERSTELLEN
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
