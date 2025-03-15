import { View, Text, TouchableOpacity } from "react-native";
import { ListItem as ListItemType } from "@/types/database.types";
import { useToggleItemCheck, useDeleteListItem } from "@/hooks/useLists";
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
    <TouchableOpacity
      onPress={handleToggle}
      className="flex-row items-center justify-between px-4 py-3 border-b border-gray-700"
      disabled={toggleCheck.isPending}
    >
      <View className="flex-row items-center flex-1">
        <View
          className={`w-6 h-6 rounded-full border-2 ${
            item.is_checked
              ? "bg-primary-1 border-primary-1"
              : "border-primary-1 bg-transparent"
          } mr-3 items-center justify-center`}
        >
          {item.is_checked && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
        <View className="flex-1">
          <Text
            className={`text-base ${
              item.is_checked ? "text-gray-400 line-through" : "text-white"
            } font-rubik`}
          >
            {item.item.name}
          </Text>
          {item.notes && (
            <Text className="text-sm text-gray-400 font-rubik">
              {item.notes}
            </Text>
          )}
        </View>
        <Text className="text-sm text-gray-400 ml-2 font-rubik">
          {item.quantity} Stück
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleDelete}
        className="ml-4 p-2"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={deleteItem.isPending}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
