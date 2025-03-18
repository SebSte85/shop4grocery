"use client";

import React, { useRef, useState } from "react";
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
import LottieView from "lottie-react-native";

export function ListItem({ item }: { item: ListItemType }) {
  const toggleCheck = useToggleItemCheck();
  const deleteItem = useDeleteListItem();
  const updateItem = useUpdateListItem();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const animationRef = useRef<LottieView>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    if (isAnimating) return;

    if (!item.is_checked) {
      // When checking the item, play animation first
      setIsAnimating(true);
      // Kurze Verzögerung, um sicherzustellen, dass die Animation-Komponente gerendert ist
      setTimeout(() => {
        animationRef.current?.play();
      }, 50);
    } else {
      // When unchecking, update state immediately
      toggleCheck.mutate({
        listItemId: item.id,
        isChecked: false,
      });
    }
  };

  const handleAnimationFinish = () => {
    // Add a small delay before updating the state to ensure a smooth transition
    setTimeout(() => {
      setIsAnimating(false);
      // Update the state after animation completes
      toggleCheck.mutate({
        listItemId: item.id,
        isChecked: true,
      });
    }, 300);
  };

  const handleDelete = () => {
    deleteItem.mutate({
      listItemId: item.id,
    });
  };

  const handlePress = () => {
    console.log("Opening bottom sheet for item:", item.item.name);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.present();
    } else {
      console.error("bottomSheetRef is null");
    }
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
        <View className="relative mr-4">
          <TouchableOpacity
            onPress={handleToggle}
            className={`w-6 h-6 rounded-full border ${
              isAnimating ? "border-primary-1 bg-primary-2" : "border-primary-1"
            } items-center justify-center`}
            disabled={isAnimating}
          >
            {item.is_checked && !isAnimating && (
              <View className="w-4 h-4 rounded-full bg-primary-1" />
            )}
          </TouchableOpacity>

          {isAnimating && (
            <View
              style={{
                position: "absolute",
                left: -7,
                top: -7,
                width: 38,
                height: 38,
                zIndex: 10,
              }}
            >
              <LottieView
                ref={animationRef}
                source={require("../../assets/animations/Checkmark.json")}
                style={{
                  width: 38,
                  height: 38,
                }}
                loop={false}
                autoPlay={true}
                speed={0.7}
                onAnimationFinish={handleAnimationFinish}
              />
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text
            variant="medium"
            className={`text-lg text-white font-rubik-semibold ${
              item.is_checked ? "line-through opacity-50" : ""
            } ${isAnimating ? "text-primary-1" : ""}`}
          >
            {item.item?.name || "Unbekanntes Item"}
          </Text>
          <Text
            variant="light"
            className={`text-sm text-black-3 font-rubik-semibold ${
              item.is_checked ? "opacity-50" : ""
            } ${isAnimating ? "text-primary-1 opacity-70" : ""}`}
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
