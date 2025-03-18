import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CategoryIconProps {
  icon: string;
  size?: number;
  color?: string;
  className?: string;
}

export function CategoryIcon({
  icon,
  size = 24,
  color = "#B23FFF",
  className = "",
}: CategoryIconProps) {
  // Map category icons to Ionicons
  const getIconName = (categoryIcon: string): string => {
    const iconMap: Record<string, string> = {
      leaf: "leaf",
      bread: "restaurant",
      milk: "water",
      meat: "nutrition",
      snow: "snow",
      water: "water",
      can: "cube",
      candy: "ice-cream",
      spice: "flask",
      home: "home",
      cart: "cart",
    };

    return iconMap[categoryIcon] || "cart";
  };

  return (
    <View className={className}>
      <Ionicons name={getIconName(icon) as any} size={size} color={color} />
    </View>
  );
}
