import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ShoppingList } from "@/types/database.types";
import { SupermarketLogo } from "@/components/ui/SupermarketLogo";
import { useStoreShoppingCount } from "@/hooks/useStoreStats";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";

interface ListCardProps {
  list: ShoppingList;
  onPress: () => void;
}

export function ListCard({ list, onPress }: ListCardProps) {
  const { user } = useAuth();
  const completedItems =
    list.items?.filter((item) => item.is_checked).length || 0;
  const totalItems = list.items?.length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Anzahl der Einkäufe für diesen Supermarkt abrufen
  const { data: shoppingCount } = useStoreShoppingCount(list.name);

  // Check if the list is shared and if it belongs to the current user
  const isShared = list.is_shared;
  const isOwnList = user?.id === list.user_id;
  const isSharedWithMe = isShared && !isOwnList;

  return (
    <TouchableOpacity onPress={onPress} className="mb-4">
      <View className="bg-black-2 p-4 rounded-xl">
        <View className="flex-row items-center mb-2">
          <View className="flex-row items-center flex-1">
            <Text variant="semibold" className="text-lg">
              {list.name}
            </Text>
            <View className="flex-row items-center ml-3">
              <SupermarketLogo name={list.name} size={24} />
              {shoppingCount !== undefined && shoppingCount > 0 && (
                <View className="bg-black-1 px-2 py-1 rounded-full ml-3">
                  <Text variant="medium" className="text-xs text-primary-1">
                    {shoppingCount}x
                  </Text>
                </View>
              )}

              {/* Shared list indicator */}
              {isShared && (
                <View
                  className={`px-2 py-1 rounded-full ml-2 ${
                    isSharedWithMe ? "bg-blue-900/30" : "bg-primary-1/20"
                  }`}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="people"
                      size={12}
                      color={isSharedWithMe ? "#3b82f6" : "#8b5cf6"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      variant="medium"
                      className={`text-xs ${
                        isSharedWithMe ? "text-blue-500" : "text-primary-1"
                      }`}
                    >
                      {isSharedWithMe ? "Geteilt mit mir" : "Geteilt"}
                    </Text>
                  </View>
                </View>
              )}
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
        <View className="h-2 bg-black-1 rounded-full overflow-hidden">
          <View
            className="h-full bg-primary-1 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
