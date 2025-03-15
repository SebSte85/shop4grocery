import { View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "@/components/ui/Text";
import { SupermarketLogo } from "@/components/ui/SupermarketLogo";
import { POPULAR_SUPERMARKETS } from "@/constants/supermarkets";

interface SupermarketSelectorProps {
  onSelect: (name: string) => void;
}

export function SupermarketSelector({ onSelect }: SupermarketSelectorProps) {
  return (
    <View className="mt-4">
      <Text variant="medium" className="mb-2 text-black-3">
        Beliebte Supermärkte
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row"
      >
        {POPULAR_SUPERMARKETS.map((supermarket) => (
          <TouchableOpacity
            key={supermarket.name}
            onPress={() => onSelect(supermarket.name)}
            className="bg-black-2 rounded-xl p-2 mr-2 flex-row items-center"
          >
            <SupermarketLogo name={supermarket.name} size={20} />
            <Text variant="medium" className="ml-2 text-white">
              {supermarket.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
