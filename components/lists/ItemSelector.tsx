import { View, Text, TouchableOpacity } from "react-native";
import { Item } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";

interface ItemSelectorProps {
  item: Item;
  onSelect: (item: Item) => void;
  isSelected: boolean;
  isNewItem?: boolean;
  isClickable?: boolean;
}

export function ItemSelector({
  item,
  onSelect,
  isSelected,
  isNewItem = false,
  isClickable = true,
}: ItemSelectorProps) {
  const handlePress = () => {
    if (isClickable) {
      onSelect(item);
    }
  };

  // Wrapper-Komponente basierend auf isClickable
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isClickable) {
      return (
        <TouchableOpacity
          onPress={handlePress}
          className={`flex-row items-center py-4 px-4 border-b border-black-2 ${
            isNewItem ? "bg-black-2" : ""
          }`}
        >
          {children}
        </TouchableOpacity>
      );
    } else {
      return (
        <View
          className={`flex-row items-center py-4 px-4 border-b border-black-2 ${
            isNewItem ? "bg-black-2" : ""
          }`}
        >
          {children}
        </View>
      );
    }
  };

  return (
    <Wrapper>
      {isClickable ? (
        <TouchableOpacity
          onPress={handlePress}
          className="mr-3"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isSelected ? (
            <View className="w-6 h-6 rounded-full bg-primary-1 items-center justify-center">
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          ) : (
            <View
              className={`w-6 h-6 rounded-full border ${
                isNewItem ? "border-primary-1" : "border-gray-400"
              } items-center justify-center`}
            >
              <Ionicons
                name="add"
                size={16}
                color={isNewItem ? "#8B5CF6" : "#666"}
              />
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View className="mr-3">
          <View
            className={`w-6 h-6 rounded-full border ${
              isNewItem ? "border-primary-1" : "border-gray-400"
            } items-center justify-center`}
          >
            <Ionicons
              name="add"
              size={16}
              color={isNewItem ? "#8B5CF6" : "#666"}
            />
          </View>
        </View>
      )}

      <Text
        className={`font-rubik flex-1 ${
          isNewItem ? "text-primary-1" : "text-white"
        }`}
      >
        {isNewItem ? `${item.name} (Neu)` : item.name}
      </Text>

      {isSelected && isClickable && (
        <TouchableOpacity
          onPress={handlePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </Wrapper>
  );
}
