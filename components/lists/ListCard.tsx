import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { ShoppingList } from "@/types/database.types";

interface ListCardProps {
  list: ShoppingList;
}

export function ListCard({ list }: ListCardProps) {
  const router = useRouter();
  const completedItems =
    list.items?.filter((item) => item.is_checked)?.length || 0;
  const totalItems = list.items?.length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/lists/${list.id}`)}
      className="bg-black-2 rounded-xl p-4 mb-2"
    >
      <Text variant="semibold" className="text-lg mb-2">
        {list.name}
      </Text>

      <View className="flex-row justify-between items-center mb-2">
        <Text variant="light" className="text-black-3 font-rubik-semibold">
          {totalItems} {totalItems === 1 ? "Item" : "Items"}
        </Text>
        <Text variant="medium" className="text-primary-1">
          {Math.round(progress)}% erledigt
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="h-1 bg-black-1 rounded-full overflow-hidden">
        <View
          className="h-full bg-primary-1 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
    </TouchableOpacity>
  );
}
