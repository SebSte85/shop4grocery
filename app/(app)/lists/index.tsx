import { View, ScrollView } from "react-native";
import { Text } from "@/components/ui/Text";
import { ListCard } from "@/components/lists/ListCard";
import { useListsWithRealtime } from "@/hooks/useLists";
import { useRouter, Link } from "expo-router";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import PremiumLimitIndicator from "@/components/subscription/PremiumLimitIndicator";

export default function ListsScreen() {
  const { data: lists, isLoading, isSubscribed } = useListsWithRealtime();
  const router = useRouter();
  const { plan } = useSubscription();
  const { user } = useAuth();

  // Only count lists owned by the user (not shared lists)
  const ownedLists =
    lists?.filter(
      (list) => list.user_id === user?.id && list.owner_id === user?.id
    ) || [];
  const currentListsCount = ownedLists.length;
  const isPremium = plan === "premium";

  if (isLoading) {
    return (
      <View className="flex-1 bg-black-1 items-center justify-center">
        <Text variant="medium">Laden...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black-1">
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text variant="semibold" className="text-3xl text-primary-1">
              Meine Listen
            </Text>
            {!isPremium && (
              <View className="ml-3">
                <PremiumLimitIndicator
                  featureName="maxShoppingLists"
                  currentCount={currentListsCount}
                />
              </View>
            )}
          </View>
          <View className="flex-row items-center">
            {isPremium && isSubscribed && (
              <View className="bg-green-800/30 px-2 py-1 rounded-full">
                <Text className="text-green-500 text-xs">Live</Text>
              </View>
            )}
            {isPremium && (
              <View className="ml-2 bg-purple-900/30 px-2 py-1 rounded-full">
                <Text className="text-purple-500 text-xs">Premium</Text>
              </View>
            )}
          </View>
        </View>

        <Text variant="light" className="text-black-3 mt-1 font-rubik-semibold">
          Verwalte deine Einkaufslisten
        </Text>
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
