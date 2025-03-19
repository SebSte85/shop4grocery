import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/Text";
import { ListItem, Unit } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import { useCategories, useUpdateItemCategory } from "@/hooks/useCategories";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

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
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [unit, setUnit] = useState<Unit>(item.unit || "Stück");
  const { data: categories } = useCategories();
  const updateItemCategory = useUpdateItemCategory();
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >(item.item.category_id);
  const [tempQuantity, setTempQuantity] = useState(String(quantity || 1));

  // Update local state when item changes
  useEffect(() => {
    setQuantity(item.quantity || 1);
    setUnit(item.unit || "Stück");
    setSelectedCategoryId(item.item.category_id);
    setTempQuantity(String(item.quantity || 1));
  }, [item]);

  const snapPoints = useMemo(() => ["75%"], []);

  const handleSheetChanges = useCallback((index: number) => {}, []);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
    setTempQuantity(newQuantity.toString());
  }, []);

  const handleUnitChange = useCallback(
    (newUnit: Unit) => {
      setUnit(newUnit);
      if (PRECISE_UNITS.includes(newUnit) !== PRECISE_UNITS.includes(unit)) {
        setQuantity(1);
        setTempQuantity("1");
      }
    },
    [unit]
  );

  const handlePreciseQuantityChange = useCallback((value: string) => {
    const numValue = parseInt(value) || 0;
    setTempQuantity(value);
    setQuantity(numValue);
  }, []);

  const handleSave = useCallback(() => {
    const finalQuantity = Math.max(1, quantity);
    onUpdate(finalQuantity, unit);

    // Update category if changed
    if (selectedCategoryId !== item.item.category_id) {
      updateItemCategory.mutate(
        {
          itemId: item.item.id,
          categoryId: selectedCategoryId || "",
        },
        {
          onSuccess: () => {},
          onError: (error) => {},
        }
      );
    }

    bottomSheetRef.current?.dismiss();
  }, [
    quantity,
    unit,
    onUpdate,
    selectedCategoryId,
    item.item.category_id,
    updateItemCategory,
  ]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

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

  const isPreciseUnit = PRECISE_UNITS.includes(unit);

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
      <BottomSheetScrollView contentContainerStyle={{ flexGrow: 1 }}>
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
          <View className="mb-6">
            <Text variant="medium" className="mb-4 text-white">
              Einheit
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {UNITS.map((u) => (
                <TouchableOpacity key={u} onPress={() => handleUnitChange(u)}>
                  <View
                    className={`h-14 px-6 rounded-xl items-center justify-center ${
                      unit === u ? "bg-primary-1" : "bg-[#1E2B49]"
                    }`}
                  >
                    <Text
                      variant="semibold"
                      className={`text-lg ${
                        unit === u ? "text-white" : "text-black-3"
                      }`}
                    >
                      {u}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Selector */}
          <View className="mb-6">
            <Text variant="medium" className="mb-4 text-white">
              Kategorie
            </Text>
            {categories && categories.length > 0 ? (
              <View className="flex-row flex-wrap gap-3">
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => handleCategorySelect(category.id)}
                  >
                    <View
                      className={`h-14 px-4 rounded-xl items-center justify-center flex-row ${
                        selectedCategoryId === category.id
                          ? "bg-primary-1"
                          : "bg-[#1E2B49]"
                      }`}
                    >
                      <CategoryIcon
                        icon={category.icon}
                        size={16}
                        color={
                          selectedCategoryId === category.id ? "white" : "#666"
                        }
                      />
                      <Text
                        variant="semibold"
                        className={`text-lg ml-2 ${
                          selectedCategoryId === category.id
                            ? "text-white"
                            : "text-black-3"
                        }`}
                      >
                        {category.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="h-14 bg-[#1E2B49] rounded-xl items-center justify-center">
                <Text variant="medium" className="text-black-3">
                  Kategorien werden geladen...
                </Text>
              </View>
            )}
          </View>

          {/* Save Button */}
          <View className="bg-primary-1 py-3 rounded-xl items-center mt-4">
            <TouchableOpacity onPress={handleSave}>
              <Text variant="semibold" className="uppercase">
                SPEICHERN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    zIndex: 1000,
    elevation: 10,
  },
});
