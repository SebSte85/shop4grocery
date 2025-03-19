import { View, ScrollView } from "react-native";
import { Text } from "@/components/ui/Text";
import { ListCard } from "@/components/lists/ListCard";
import { useListsWithRealtime } from "@/hooks/useLists";
import { useRouter, Link } from "expo-router";
import { TouchableOpacity } from "react-native-gesture-handler";

export default function ListsScreen() {
  const { data: lists, isLoading, isSubscribed } = useListsWithRealtime();
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="flex-1 bg-black-1 items-center justify-center">
        <Text variant="medium">Laden...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black-1">
      <View className="p-4 flex-row items-center justify-between">
        <View>
          <Text variant="semibold" className="text-3xl text-primary-1">
            Meine Listen
          </Text>
          <Text
            variant="light"
            className="text-black-3 mt-1 font-rubik-semibold"
          >
            Verwalte deine Einkaufslisten
          </Text>
        </View>
        {isSubscribed && (
          <View className="bg-green-800/30 px-2 py-1 rounded-full">
            <Text className="text-green-500 text-xs">Live</Text>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 px-4">
        {lists?.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            onPress={() => router.push(`/lists/${list.id}`)}
          />
        ))}

        {lists?.length === 0 && (
          <View className="flex-1 items-center justify-center py-8">
            <Text variant="medium" className="text-black-3 text-center">
              Keine Listen vorhanden
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Link href="/lists/new" asChild>
        <TouchableOpacity className="absolute bottom-8 right-8 w-14 h-14 rounded-full bg-primary-1 items-center justify-center">
          <Text variant="bold" className="text-2xl text-white">
            +
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
