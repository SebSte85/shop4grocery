import React, {
  useCallback,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { View, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/Text";
import { useLists } from "@/hooks/useLists";
import { ShoppingList } from "@/types/database.types";

interface ListSelectorBottomSheetProps {
  onListSelected: (listId: string) => void;
  onDismiss?: () => void;
}

export type ListSelectorBottomSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

const ListSelectorBottomSheet = forwardRef<
  ListSelectorBottomSheetHandle,
  ListSelectorBottomSheetProps
>(({ onListSelected, onDismiss }, ref) => {
  const { data: lists, isLoading } = useLists();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%"], []);

  useImperativeHandle(ref, () => ({
    present: () => {
      if (bottomSheetRef.current) {
        bottomSheetRef.current.expand();
      }
    },
    dismiss: () => {
      if (bottomSheetRef.current) {
        bottomSheetRef.current.close();
      }
    },
  }));

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleSelectList = (list: ShoppingList) => {
    onListSelected(list.id);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.close();
    }
  };

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1 && onDismiss) {
        onDismiss();
      }
    },
    [onDismiss]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      onChange={handleSheetChanges}
      handleIndicatorStyle={{ backgroundColor: "#8B5CF6" }}
      backgroundStyle={{ backgroundColor: "#121212" }}
    >
      <View className="p-4 flex-1">
        <Text variant="semibold" className="text-2xl mb-4 text-primary-1">
          Wähle eine Liste
        </Text>

        {isLoading ? (
          <Text variant="medium" className="text-center py-8 text-white">
            Laden...
          </Text>
        ) : lists && lists.length > 0 ? (
          lists.map((list) => (
            <TouchableOpacity
              key={list.id}
              className="bg-black-2 py-4 px-4 mb-2 rounded-lg"
              onPress={() => handleSelectList(list)}
            >
              <Text variant="medium">{list.name}</Text>
              <Text variant="light" className="text-black-3 mt-1 text-xs">
                {list.items?.length || 0} Items
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text variant="medium" className="text-center py-8 text-white">
            Keine Listen verfügbar
          </Text>
        )}
      </View>
    </BottomSheet>
  );
});

export default ListSelectorBottomSheet;
