import { View, TouchableOpacity, Alert } from "react-native";
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
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError(null);

    try {
      await createList.mutateAsync({ name: name.trim() });
      router.back();
    } catch (error: any) {
      console.error("Error creating list:", error);

      // Check if the error is about the list limit
      if (error.message?.includes("Limit erreicht")) {
        Alert.alert(
          "Limit erreicht",
          "Du hast das Maximum von 3 Listen für kostenlose Nutzer erreicht. Upgrade auf Premium im Profilbereich für unbegrenzte Listen.",
          [
            {
              text: "Abbrechen",
              style: "cancel",
            },
            {
              text: "Zum Profil",
              onPress: () => router.push("/(app)/profile"),
            },
          ]
        );
      } else {
        // Show other errors in the UI
        setError(error.message || "Ein Fehler ist aufgetreten");
      }
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

        {error && <Text className="text-red-500 mt-2">{error}</Text>}

        <SupermarketSelector onSelect={setName} />
      </View>

      {/* Bottom Button */}
      <View className="px-4 pb-8">
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim() || createList.isPending}
          className="bg-primary-1 p-4 rounded-xl items-center"
        >
          <Text variant="semibold" className="uppercase text-white">
            {createList.isPending ? "WIRD ERSTELLT..." : "LISTE ERSTELLEN"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
