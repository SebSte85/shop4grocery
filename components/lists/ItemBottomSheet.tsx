import React, { useCallback, useMemo, useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetTextInput,
  TouchableOpacity,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/Text";
import { ListItem, Unit } from "@/types/database.types";

interface ItemBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  item: ListItem;
  onUpdate: (quantity: number, unit: Unit) => void;
}

const UNITS: Unit[] = ["Stück", "kg", "g", "l", "ml"];
const PRECISE_UNITS = ["g", "ml"];

export function ItemBottomSheet({
  bottomSheetRef,
  item,
  onUpdate,
}: ItemBottomSheetProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [selectedUnit, setSelectedUnit] = useState(item.unit);
  const [tempQuantity, setTempQuantity] = useState(quantity.toString());

  const snapPoints = useMemo(() => ["60%"], []);

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
    setTempQuantity(newQuantity.toString());
  }, []);

  const handleUnitChange = useCallback(
    (newUnit: Unit) => {
      setSelectedUnit(newUnit);
      if (
        PRECISE_UNITS.includes(newUnit) !== PRECISE_UNITS.includes(selectedUnit)
      ) {
        setQuantity(1);
        setTempQuantity("1");
      }
    },
    [selectedUnit]
  );

  const handlePreciseQuantityChange = useCallback((value: string) => {
    const numValue = parseInt(value) || 0;
    setTempQuantity(value);
    setQuantity(numValue);
  }, []);

  const handleSave = useCallback(() => {
    const finalQuantity = Math.max(1, quantity);
    onUpdate(finalQuantity, selectedUnit);
    bottomSheetRef.current?.dismiss();
  }, [quantity, selectedUnit, onUpdate]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.7}
      />
    ),
    []
  );

  const isPreciseUnit = PRECISE_UNITS.includes(selectedUnit);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#011A38" }}
      handleIndicatorStyle={{ backgroundColor: "#ffffff33" }}
      enablePanDownToClose={true}
      style={styles.bottomSheet}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <View className="px-4 flex-1">
          <Text variant="semibold" className="text-2xl mb-6 text-primary-1">
            {item.item?.name}
          </Text>

          {/* Quantity Selector */}
          <View className="mb-8">
            <Text variant="medium" className="mb-4 text-white">
              Menge
            </Text>

            {!isPreciseUnit ? (
              <View className="items-center">
                <View className="h-14 bg-[#1E2B49] rounded-xl px-6 flex-row items-center justify-between w-[200px]">
                  <TouchableOpacity
                    onPress={() => handleQuantityChange(quantity - 1)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text
                      variant="semibold"
                      className="text-2xl text-primary-1"
                    >
                      -
                    </Text>
                  </TouchableOpacity>

                  <Text variant="semibold" className="text-2xl text-white">
                    {quantity}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleQuantityChange(quantity + 1)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text
                      variant="semibold"
                      className="text-2xl text-primary-1"
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="items-center">
                <BottomSheetTextInput
                  value={tempQuantity}
                  onChangeText={handlePreciseQuantityChange}
                  keyboardType="numeric"
                  style={{
                    width: 200,
                    height: 56, // entspricht h-14
                    backgroundColor: "#1E2B49",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 24,
                    textAlign: "center",
                    fontFamily: "Rubik-SemiBold",
                  }}
                />
              </View>
            )}
          </View>

          {/* Unit Selector */}
          <View className="mb-4">
            <Text variant="medium" className="mb-4 text-white">
              Einheit
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  onPress={() => handleUnitChange(unit)}
                >
                  <View
                    className={`h-14 px-6 rounded-xl items-center justify-center ${
                      selectedUnit === unit ? "bg-primary-1" : "bg-[#1E2B49]"
                    }`}
                  >
                    <Text
                      variant="semibold"
                      className={`text-lg ${
                        selectedUnit === unit ? "text-white" : "text-black-3"
                      }`}
                    >
                      {unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <View className=" bg-primary-1 py-3 rounded-xl items-center mt-4">
            <TouchableOpacity onPress={handleSave}>
              <Text variant="semibold" className=" uppercase">
                SPEICHERN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    zIndex: 1000,
    elevation: 10,
  },
});
