import { View, Text, TouchableOpacity } from "react-native";
import { Item } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";

interface ItemSelectorProps {
  item: Item;
  onSelect: (item: Item) => void;
  isSelected: boolean;
}

export function ItemSelector({
  item,
  onSelect,
  isSelected,
}: ItemSelectorProps) {
  return (
    <TouchableOpacity
      onPress={() => onSelect(item)}
      className="flex-row items-center py-4 px-4 border-b border-black-2"
    >
      <TouchableOpacity
        onPress={() => onSelect(item)}
        className="mr-3"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isSelected ? (
          <View className="w-6 h-6 rounded-full bg-primary-1 items-center justify-center">
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        ) : (
          <View className="w-6 h-6 rounded-full border border-gray-400 items-center justify-center">
            <Ionicons name="add" size={16} color="#666" />
          </View>
        )}
      </TouchableOpacity>
      <Text className="text-white font-rubik flex-1">{item.name}</Text>
      {isSelected && (
        <TouchableOpacity
          onPress={() => onSelect(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
