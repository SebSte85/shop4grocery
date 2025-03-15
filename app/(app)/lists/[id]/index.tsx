import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/Text";
import { ListItem } from "@/components/lists/ListItem";
import { useList } from "@/hooks/useLists";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { ShoppingList } from "@/types/database.types";

export default function ListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: list, isLoading } = useList(id) as {
    data: ShoppingList | undefined;
    isLoading: boolean;
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black-1 items-center justify-center">
        <Text variant="medium">Laden...</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <View className="flex-1 bg-black-1 items-center justify-center">
        <Text variant="medium" className="text-black-3">
          Liste nicht gefunden
        </Text>
      </View>
    );
  }

  const completedItems =
    list.items?.filter((item) => item.is_checked)?.length || 0;
  const totalItems = list.items?.length || 0;

  return (
    <View className="flex-1 bg-black-1">
      {/* Header */}
      <View className="flex-row items-center juc p-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text variant="semibold" className="text-3xl text-primary-1">
          {list.name}
        </Text>
      </View>

      {/* Progress */}
      <View className="bg-black-2 p-4 mx-4 rounded-xl mb-4">
        <Text variant="medium" className="mb-2">
          Fortschritt
        </Text>
        <Text variant="light" className="text-black-3">
          {completedItems} von {totalItems} Items erledigt
        </Text>
      </View>

      {/* Items */}
      <View className="flex-1 px-4">
        {list.items && list.items.length > 0 ? (
          <View className="space-y-2">
            <Text variant="medium" className="mb-2">
              Noch zu kaufen
            </Text>
            {list.items.map((item) => (
              <ListItem key={item.id} item={item} />
            ))}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text variant="medium" className="text-black-3 text-center">
              Keine Items in der Liste
            </Text>
          </View>
        )}
      </View>

      {/* Add Button */}
      <TouchableOpacity
        onPress={() => router.push(`/lists/${id}/add-items`)}
        className="mx-4 mb-8 bg-primary-1 p-4 rounded-xl items-center"
      >
        <Text variant="semibold" className="uppercase">
          ITEMS HINZUFÜGEN
        </Text>
      </TouchableOpacity>
    </View>
  );
}
