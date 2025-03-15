import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ShoppingList } from "@/types/database.types";
import { SupermarketLogo } from "@/components/ui/SupermarketLogo";

interface ListCardProps {
  list: ShoppingList;
  onPress: () => void;
}

export function ListCard({ list, onPress }: ListCardProps) {
  const completedItems =
    list.items?.filter((item) => item.is_checked).length || 0;
  const totalItems = list.items?.length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <TouchableOpacity onPress={onPress} className="mb-4">
      <View className="bg-black-2 p-4 rounded-xl">
        <View className="flex-row items-center mb-2">
          <View className="flex-row items-center flex-1">
            <Text variant="semibold" className="text-lg">
              {list.name}
            </Text>
            <View className="ml-4">
              <SupermarketLogo name={list.name} size={24} />
            </View>
          </View>
          <Text variant="medium" className="text-primary-1">
            {progress.toFixed(0)}% erledigt
          </Text>
        </View>

        <View className="flex-row items-center mb-2">
          <Text variant="light" className="text-black-3 font-rubik-semibold">
            {totalItems} Items
          </Text>
        </View>

        {/* Progress Bar */}
        <View className="h-1 bg-black-1 rounded-full overflow-hidden">
          <View
            className="h-full bg-primary-1 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
