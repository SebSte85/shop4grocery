import React from "react";
import { View } from "react-native";
import { ListItem as ListItemType, Unit } from "@/types/database.types";
import {
  useToggleItemCheck,
  useDeleteListItem,
  useUpdateListItem,
} from "@/hooks/useLists";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ItemBottomSheet } from "./ItemBottomSheet";

export function ListItem({ item }: { item: ListItemType }) {
  const toggleCheck = useToggleItemCheck();
  const deleteItem = useDeleteListItem();
  const updateItem = useUpdateListItem();
  const bottomSheetRef = React.useRef<BottomSheetModal>(null);

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

  const handlePress = () => {
    bottomSheetRef.current?.present();
  };

  const handleUpdate = (quantity: number, unit: Unit) => {
    updateItem.mutate({
      listItemId: item.id,
      quantity,
      unit,
    });
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        className="flex-row items-center bg-black-2 rounded-xl p-4 mb-2"
      >
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
            className={`text-lg text-white font-rubik-semibold ${
              item.is_checked ? "line-through opacity-50" : ""
            }`}
          >
            {item.item?.name || "Unbekanntes Item"}
          </Text>
          <Text
            variant="light"
            className={`text-sm text-black-3 font-rubik-semibold ${
              item.is_checked ? "opacity-50" : ""
            }`}
          >
            {item.quantity} {item.unit}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </TouchableOpacity>

      <ItemBottomSheet
        bottomSheetRef={bottomSheetRef}
        item={item}
        onUpdate={handleUpdate}
      />
    </>
  );
}
