import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Category } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";

interface CategorySelectorProps {
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
}

export function CategorySelector({
  selectedCategory,
  onSelectCategory,
}: CategorySelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { data: categories, isLoading } = useCategories();

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        className="flex-row items-center bg-black-2 p-3 rounded-lg"
      >
        {selectedCategory ? (
          <>
            <Ionicons
              name={selectedCategory.icon as any}
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white font-rubik flex-1">
              {selectedCategory.name}
            </Text>
          </>
        ) : (
          <Text className="text-gray-400 font-rubik flex-1">
            Kategorie auswählen
          </Text>
        )}
        <Ionicons name="chevron-down" size={20} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 bg-black-1/95 justify-end">
          <View className="bg-black-2 rounded-t-xl">
            <View className="p-4 border-b border-black-1 flex-row justify-between items-center">
              <Text className="text-white font-rubik text-lg">
                Kategorie auswählen
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96 p-4">
              {isLoading ? (
                <Text className="text-white text-center">Laden...</Text>
              ) : (
                <View className="space-y-2">
                  {categories?.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => {
                        onSelectCategory(category);
                        setIsModalVisible(false);
                      }}
                      className={`flex-row items-center p-3 rounded-lg ${
                        selectedCategory?.id === category.id
                          ? "bg-primary-1"
                          : "bg-black-1"
                      }`}
                    >
                      <Ionicons
                        name={category.icon as any}
                        size={20}
                        color="white"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-white font-rubik flex-1">
                        {category.name}
                      </Text>
                      {selectedCategory?.id === category.id && (
                        <Ionicons name="checkmark" size={20} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
