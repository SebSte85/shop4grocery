import React, { useCallback, useMemo } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { ShoppingList } from "@/types/database.types";

interface ListSelectorBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  lists: ShoppingList[] | undefined;
  listsLoading: boolean;
  selectedListId: string | null;
  setSelectedListId: (id: string) => void;
  isAddingToList: boolean;
  onAddToList: () => void;
}

export function ListSelectorBottomSheet({
  bottomSheetRef,
  lists,
  listsLoading,
  selectedListId,
  setSelectedListId,
  isAddingToList,
  onAddToList,
}: ListSelectorBottomSheetProps) {
  // Bottom Sheet Configuration
  const snapPoints = useMemo(() => ["50%"], []);

  // Handle backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
        pressBehavior="close"
      />
    ),
    []
  );

  // Handle close event
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, [bottomSheetRef]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: "#011A38" }}
      handleIndicatorStyle={{ backgroundColor: "#64748B" }}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableContentPanningGesture={true}
      keyboardBehavior="extend"
      onChange={(index) =>
        console.log("[DEBUG] Bottom sheet index changed:", index)
      }
      onDismiss={() =>
        console.log("[DEBUG] ListSelector BottomSheet dismissed")
      }
    >
      <View className="flex-1 p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text variant="semibold" className="text-xl">
            Liste auswählen
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {listsLoading ? (
          <ActivityIndicator size="small" color="#8B5CF6" />
        ) : (
          <>
            <BottomSheetScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
            >
              {lists && lists.length > 0 ? (
                lists.map((list) => (
                  <TouchableOpacity
                    key={list.id}
                    onPress={() => setSelectedListId(list.id)}
                    className={`p-4 mb-2 rounded-xl flex-row items-center justify-between ${
                      selectedListId === list.id
                        ? "bg-primary-1/10"
                        : "bg-black-2"
                    }`}
                  >
                    <Text variant="medium">{list.name}</Text>
                    {selectedListId === list.id && (
                      <Ionicons name="checkmark" size={24} color="#8B5CF6" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text variant="medium" className="text-center text-black-3">
                  Keine Listen vorhanden
                </Text>
              )}
            </BottomSheetScrollView>

            <TouchableOpacity
              onPress={onAddToList}
              className="bg-primary-1 p-4 rounded-xl mt-4"
              disabled={isAddingToList || !selectedListId}
            >
              {isAddingToList ? (
                <View className="flex-row justify-center items-center">
                  <ActivityIndicator size="small" color="white" />
                  <Text variant="medium" className="text-white ml-2">
                    Wird hinzugefügt...
                  </Text>
                </View>
              ) : (
                <Text
                  variant="medium"
                  className={`text-white text-center uppercase ${
                    !selectedListId ? "opacity-50" : ""
                  }`}
                >
                  Hinzufügen
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </BottomSheetModal>
  );
}
