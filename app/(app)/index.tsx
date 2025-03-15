import { View } from "react-native";
import { Link } from "expo-router";
import { Text } from "@/components/ui/Text";
import { ListCard } from "@/components/lists/ListCard";
import { useLists } from "@/hooks/useLists";
import { TouchableOpacity } from "react-native-gesture-handler";

export default function ListsScreen() {
  const { data: lists, isLoading } = useLists();

  if (isLoading) {
    return (
      <View className="flex-1 bg-black-1 items-center justify-center">
        <Text variant="medium">Laden...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black-1">
      {/* Header */}
      <View className="p-6">
        <Text variant="extrabold" className="text-3xl mb-2">
          Meine Listen
        </Text>
        <Text variant="light" className="text-black-3 font-rubik-semibold">
          Verwalte deine Einkaufslisten
        </Text>
      </View>

      {/* Listen */}
      <View className="flex-1 px-4">
        {lists && lists.length > 0 ? (
          <View className="space-y-4">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text variant="medium" className="text-black-3 text-center mb-4">
              Du hast noch keine Listen erstellt
            </Text>
          </View>
        )}
      </View>

      {/* Floating Action Button */}
      <Link href="/lists/new" asChild>
        <TouchableOpacity className="absolute bottom-8 right-8 w-14 h-14 rounded-full items-center justify-center bg-primary-1">
          <Text variant="bold" className="text-2xl">
            +
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
