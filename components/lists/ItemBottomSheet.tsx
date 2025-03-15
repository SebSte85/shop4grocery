import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/Text";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ListItem, Unit } from "@/types/database.types";

interface ItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  item: ListItem;
  onUpdate: (quantity: number, unit: Unit) => void;
}

const UNITS: Unit[] = ["Stück", "kg", "g", "l", "ml"];

export function ItemBottomSheet({
  bottomSheetRef,
  item,
  onUpdate,
}: ItemBottomSheetProps) {
  const snapPoints = useMemo(() => ["50%"], []);

  const handleQuantityChange = useCallback(
    (newQuantity: number) => {
      if (newQuantity < 1) return;
      onUpdate(newQuantity, item.unit);
    },
    [item.unit, onUpdate]
  );

  const handleUnitChange = useCallback(
    (newUnit: Unit) => {
      onUpdate(item.quantity, newUnit);
    },
    [item.quantity, onUpdate]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: "#011A38" }}
      handleIndicatorStyle={{ backgroundColor: "#ffffff33" }}
    >
      <View className="flex-1 px-4">
        <Text variant="semibold" className="text-2xl mb-6">
          {item.item?.name}
        </Text>

        {/* Quantity Selector */}
        <View className="mb-8">
          <Text variant="medium" className="mb-4">
            Menge
          </Text>
          <View className="flex-row items-center justify-center space-x-6">
            <TouchableOpacity
              onPress={() => handleQuantityChange(item.quantity - 1)}
              className="w-12 h-12 rounded-full bg-black-2 items-center justify-center"
            >
              <Text variant="semibold" className="text-2xl">
                -
              </Text>
            </TouchableOpacity>

            <Text variant="semibold" className="text-3xl w-12 text-center">
              {item.quantity}
            </Text>

            <TouchableOpacity
              onPress={() => handleQuantityChange(item.quantity + 1)}
              className="w-12 h-12 rounded-full bg-black-2 items-center justify-center"
            >
              <Text variant="semibold" className="text-2xl">
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Unit Selector */}
        <View>
          <Text variant="medium" className="mb-4">
            Einheit
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {UNITS.map((unit) => (
              <TouchableOpacity
                key={unit}
                onPress={() => handleUnitChange(unit)}
                className={`px-4 py-2 rounded-full ${
                  item.unit === unit ? "bg-primary-1" : "bg-black-2"
                }`}
              >
                <Text variant="medium">{unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
}
