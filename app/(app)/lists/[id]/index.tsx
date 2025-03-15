import { View, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/Text";
import { ListItem } from "@/components/lists/ListItem";
import { useList, useDeleteList } from "@/hooks/useLists";
import { TouchableOpacity, ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { ShoppingList } from "@/types/database.types";
import { Image } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export default function ListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: list, isLoading } = useList(id) as {
    data: ShoppingList | undefined;
    isLoading: boolean;
  };
  const deleteList = useDeleteList();

  const handleDeleteList = () => {
    Alert.alert("Liste löschen", "Möchtest du diese Liste wirklich löschen?", [
      {
        text: "Abbrechen",
        style: "cancel",
      },
      {
        text: "Löschen",
        onPress: () => {
          deleteList.mutate(id);
        },
        style: "destructive",
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black-1 items-center justify-center">
        <Text variant="medium">Laden...</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <View className="flex-1 bg-black-1 items-center justify-center">
        <Text variant="medium" className="text-black-3">
          Liste nicht gefunden
        </Text>
      </View>
    );
  }

  const uncheckedItems = list.items?.filter((item) => !item.is_checked) || [];
  const checkedItems = list.items?.filter((item) => item.is_checked) || [];

  // Logo URL von Clearbit API
  const getLogoUrl = () => {
    const name = list.name.toLowerCase();
    if (name.includes("rewe")) {
      return "https://logo.clearbit.com/rewe.de";
    } else if (name.includes("aldi")) {
      return "https://logo.clearbit.com/aldi.de";
    } else if (name.includes("lidl")) {
      return "https://logo.clearbit.com/lidl.de";
    } else if (name.includes("netto")) {
      return "https://logo.clearbit.com/netto.de";
    }
    return null;
  };

  const logoUrl = getLogoUrl();

  return (
    <BottomSheetModalProvider>
      <View className="flex-1 bg-black-1">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text variant="semibold" className="text-3xl text-primary-1">
              {list.name}
            </Text>
            {logoUrl && (
              <Image
                source={{ uri: logoUrl }}
                className="w-8 h-8 ml-2 rounded-full"
                resizeMode="contain"
              />
            )}
          </View>
          <TouchableOpacity
            onPress={handleDeleteList}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View className="bg-black-2 p-4 mx-4 rounded-xl mb-4">
          <Text variant="medium" className="mb-2">
            Fortschritt
          </Text>
          <Text variant="light" className="text-black-3 font-rubik-semibold">
            {checkedItems.length} von {list.items?.length || 0} Items erledigt
          </Text>
        </View>

        {/* Items List */}
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Unchecked Items */}
          {uncheckedItems.length > 0 && (
            <View className="mb-6">
              <Text variant="medium" className="mb-2">
                Noch zu kaufen
              </Text>
              <View className="space-y-2">
                {uncheckedItems.map((item) => (
                  <ListItem key={item.id} item={item} />
                ))}
              </View>
            </View>
          )}

          {/* Checked Items */}
          {checkedItems.length > 0 && (
            <View className="mb-24">
              <Text variant="medium" className="mb-2">
                Bereits eingepackt
              </Text>
              <View className="space-y-2">
                {checkedItems.map((item) => (
                  <ListItem key={item.id} item={item} />
                ))}
              </View>
            </View>
          )}

          {/* Empty State */}
          {list.items?.length === 0 && (
            <View className="flex-1 items-center justify-center">
              <Text variant="medium" className="text-black-3 text-center">
                Keine Items in der Liste
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add Button */}
        <View className="px-4 pb-8 pt-2 bg-black-1">
          <TouchableOpacity
            onPress={() => router.push(`/lists/${id}/add-items`)}
            className="bg-primary-1 p-4 rounded-xl items-center"
          >
            <Text variant="semibold" className="uppercase">
              ITEMS HINZUFÜGEN
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModalProvider>
  );
}
