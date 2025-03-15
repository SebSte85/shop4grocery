import { View } from "react-native";
import { ListItem as ListItemType } from "@/types/database.types";
import { useToggleItemCheck, useDeleteListItem } from "@/hooks/useLists";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@expo/vector-icons";

export function ListItem({ item }: { item: ListItemType }) {
  const toggleCheck = useToggleItemCheck();
  const deleteItem = useDeleteListItem();

  const handleToggle = () => {
    toggleCheck.mutate({
      listItemId: item.id,
      isChecked: !item.is_checked,
    });
  };

  const handleDelete = () => {
    deleteItem.mutate({
      listItemId: item.id,
    });
  };

  return (
    <View className="flex-row items-center bg-black-2 rounded-xl p-4">
      <TouchableOpacity
        onPress={handleToggle}
        className="w-6 h-6 rounded-full border border-primary-1 mr-4 items-center justify-center"
      >
        {item.is_checked && (
          <View className="w-4 h-4 rounded-full bg-primary-1" />
        )}
      </TouchableOpacity>

      <View className="flex-1">
        <Text
          variant="medium"
          className={`text-white ${item.is_checked ? "line-through" : ""}`}
        >
          {item.item?.name || "Unbekanntes Item"}
        </Text>
        <Text variant="light" className="text-black-3">
          {item.quantity} Stück
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}
