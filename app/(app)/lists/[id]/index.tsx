import React from "react";
import { View, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/Text";
import { ListItem } from "@/components/lists/ListItem";
import { useList, useDeleteList, useListWithRealtime } from "@/hooks";
import { TouchableOpacity, ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { ShoppingList, ListItem as ListItemType } from "@/types/database.types";
import { Image } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useCreateShoppingSession } from "@/hooks";
import LottieView from "lottie-react-native";
import { useRef, useState, useEffect } from "react";
import { useCategories, useInitializeCategories } from "@/hooks";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ShareListButton } from "@/components/ShareListButton";
import { useSubscription } from "@/hooks/useSubscription";
import PremiumLimitIndicator from "@/components/subscription/PremiumLimitIndicator";
import PremiumFeatureGate from "@/components/subscription/PremiumFeatureGate";

export default function ListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: list,
    isLoading,
    isSubscribed,
  } = useListWithRealtime(id) as {
    data: ShoppingList | undefined;
    isLoading: boolean;
    isSubscribed: boolean;
  };
  const deleteList = useDeleteList();
  const createShoppingSession = useCreateShoppingSession();
  const cartAnimationRef = useRef<LottieView>(null);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const initializeCategories = useInitializeCategories();
  const { plan } = useSubscription();
  const isPremium = plan === "premium";

  // Initialize categories if they don't exist
  useEffect(() => {
    initializeCategories.mutate(undefined, {
      onSuccess: () => {
        // Categories initialized successfully
      },
      onError: () => {
        // Error initializing categories
      },
    });
  }, []);

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

  const handleCompleteShoppingSession = () => {
    if (!list || isCompletingSession) return;
    setIsCompletingSession(true);
  };

  const handleAnimationFinish = () => {
    // Einkauf abschließen, nachdem die Animation fertig ist
    if (!list) return;

    const checkedItems = list.items.filter((item) => item.is_checked);
    createShoppingSession.mutate({
      listId: list.id,
      storeName: list.name,
      items: checkedItems,
    });
  };

  if (isLoading || categoriesLoading) {
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
  const totalItems = list.items?.length || 0;

  // Group unchecked items by category
  const groupedUncheckedItems: Record<string, ListItemType[]> = {};

  // First, group items by category_id
  uncheckedItems.forEach((item) => {
    const categoryId = item.item.category_id || "uncategorized";
    if (!groupedUncheckedItems[categoryId]) {
      groupedUncheckedItems[categoryId] = [];
    }
    groupedUncheckedItems[categoryId].push(item);
  });

  // Sort categories by their order
  const sortedCategoryIds = Object.keys(groupedUncheckedItems).sort((a, b) => {
    const categoryA = categories?.find((cat) => cat.id === a);
    const categoryB = categories?.find((cat) => cat.id === b);

    if (!categoryA) return 1;
    if (!categoryB) return -1;

    return categoryA.order - categoryB.order;
  });

  // Prüfe, ob der "Einkauf fertig" Button angezeigt werden soll
  const showCompleteButton =
    uncheckedItems.length === 0 && checkedItems.length > 0;

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

  // Helper function to get category icon
  const getCategoryIcon = (categoryId: string) => {
    const category = categories?.find((cat) => cat.id === categoryId);
    return category?.icon || "cart";
  };

  // Helper function to get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories?.find((cat) => cat.id === categoryId);
    return category?.name || "Sonstiges";
  };

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
            {/* Live badge - only for premium users */}
            {isPremium && isSubscribed && (
              <View className="ml-2 bg-green-800/30 px-2 py-1 rounded-full">
                <Text className="text-green-500 text-xs">Live</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center">
            {/* Item count indicator */}
            {!isPremium && (
              <View className="mr-3">
                <PremiumLimitIndicator
                  featureName="maxItemsPerList"
                  currentCount={totalItems}
                />
              </View>
            )}
            <PremiumFeatureGate
              feature="sharingEnabled"
              fallback={<ShareListButton listId={id} />}
            >
              <ShareListButton listId={id} />
            </PremiumFeatureGate>
            <TouchableOpacity
              onPress={handleDeleteList}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress */}
        <View className="bg-black-2 p-4 mx-4 rounded-xl mb-4 flex-row items-center justify-between">
          <Text variant="medium">Fortschritt</Text>
          <Text variant="light" className="text-black-3 font-rubik-semibold">
            {checkedItems.length} von {list.items?.length || 0} Items erledigt
          </Text>
        </View>

        {/* Items List */}
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Unchecked Items by Category */}
          {uncheckedItems.length > 0 && (
            <View className="mb-6">
              <Text variant="medium" className="mb-2">
                Noch zu kaufen
              </Text>

              {sortedCategoryIds.map((categoryId) => (
                <View key={categoryId} className="mb-4">
                  <View className="flex-row items-center  mb-2">
                    <CategoryIcon
                      icon={getCategoryIcon(categoryId)}
                      size={18}
                    />
                    <Text variant="medium" className="text-primary-1 ml-2">
                      {getCategoryName(categoryId)}
                    </Text>
                  </View>
                  <View className="space-y-2">
                    {groupedUncheckedItems[categoryId].map((item) => (
                      <ListItem key={item.id} item={item} />
                    ))}
                  </View>
                </View>
              ))}
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

        {/* Action Buttons */}
        <View className="px-4 pb-8 pt-2 bg-black-1">
          {showCompleteButton ? (
            <View className="flex-row items-center">
              <View className="flex-1 mr-3">
                <TouchableOpacity
                  onPress={handleCompleteShoppingSession}
                  className="bg-primary-1 h-14 rounded-xl w-full flex-row justify-center items-center"
                  disabled={isCompletingSession}
                >
                  <Text
                    variant="semibold"
                    className="uppercase text-white mr-3"
                  >
                    EINKAUF FERTIG
                  </Text>
                  {!isCompletingSession && (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="cart" size={30} color="white" />
                    </View>
                  )}
                  {isCompletingSession && (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <LottieView
                        ref={cartAnimationRef}
                        source={require("../../../../assets/animations/Cart.json")}
                        style={{ width: 50, height: 50 }}
                        loop={false}
                        autoPlay={true}
                        speed={0.7}
                        onAnimationFinish={handleAnimationFinish}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => router.push(`/lists/${id}/add-items`)}
                className="bg-[#1E2B49] w-14 h-14 rounded-full items-center justify-center"
                disabled={isCompletingSession}
              >
                <Ionicons name="add" size={30} color="#B23FFF" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Add Items FAB - nur anzeigen, wenn der Complete Button nicht sichtbar ist */}
        {!showCompleteButton && (
          <View className="absolute bottom-8 right-8">
            <TouchableOpacity
              onPress={() => router.push(`/lists/${id}/add-items`)}
              className="bg-primary-1 w-14 h-14 rounded-full items-center justify-center shadow-lg"
            >
              <Text variant="bold" className="text-2xl text-white">
                +
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </BottomSheetModalProvider>
  );
}
