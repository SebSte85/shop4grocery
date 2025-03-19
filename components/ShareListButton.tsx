import React, { useState } from "react";
import { TouchableOpacity, View, Modal, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import {
  useShareList,
  useListShares,
  useRemoveListShare,
  useAuth,
} from "@/hooks";

interface ShareListButtonProps {
  listId: string;
}

export function ShareListButton({ listId }: ShareListButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const { mutate, isPending } = useShareList();
  const { data: shares, isLoading: sharesLoading } = useListShares(listId);
  const removeShare = useRemoveListShare();
  const [showShares, setShowShares] = useState(false);
  const { user } = useAuth();

  const handleShare = () => {
    if (!email.trim()) return;

    mutate(
      {
        listId,
        email,
      },
      {
        onSuccess: () => {
          setEmail("");
          Alert.alert("Liste geteilt", "Die Liste wurde erfolgreich geteilt.");
        },
        onError: (error: Error) => {
          Alert.alert("Fehler", error.message);
        },
      }
    );
  };

  const handleRemoveShare = (shareId: string) => {
    Alert.alert(
      "Freigabe entfernen",
      "Möchtest du diesen Benutzer wirklich entfernen?",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Entfernen",
          onPress: () => {
            removeShare.mutate(
              { shareId, listId },
              {
                onSuccess: () => {
                  Alert.alert("Erfolg", "Benutzer wurde entfernt");
                },
                onError: (error: Error) => {
                  Alert.alert("Fehler", error.message);
                },
              }
            );
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className="bg-primary-1 p-2 rounded-full mr-2"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="share-outline" size={20} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black-1/80 justify-center items-center p-4">
          <View className="bg-black-2 p-4 rounded-lg w-full max-w-md">
            <View className="flex-row justify-between items-center mb-4">
              <Text variant="semibold" className="text-xl text-white">
                Liste teilen
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text variant="medium" className="mb-2 text-white">
                Mit anderen teilen
              </Text>
              <View className="flex-row items-center">
                <View className="flex-1 mr-2">
                  <Input
                    placeholder="E-Mail eingeben"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleShare}
                  className={`bg-primary-1 py-2 px-4 rounded-lg ${
                    isPending || !email.trim() ? "opacity-50" : ""
                  }`}
                  disabled={isPending || !email.trim()}
                >
                  <Text className="text-white font-rubik">
                    {isPending ? "..." : "Teilen"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Shared with section */}
            <View>
              <TouchableOpacity
                className="flex-row items-center justify-between mb-2"
                onPress={() => setShowShares(!showShares)}
              >
                <Text variant="medium" className="text-white">
                  Geteilt mit ({shares?.length || 0})
                </Text>
                <Ionicons
                  name={showShares ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="white"
                />
              </TouchableOpacity>

              {showShares && !sharesLoading && shares && shares.length > 0 && (
                <View className="mt-2 border-t border-gray-700 pt-2">
                  {shares.map((share: any) => (
                    <View
                      key={share.id}
                      className="flex-row justify-between items-center py-2"
                    >
                      <Text className="text-white">
                        {share.user?.email || "Unbekannt"}
                      </Text>
                      {/* Show remove button for any share if user is the owner */}
                      {user?.id === share.user_id && (
                        <TouchableOpacity
                          onPress={() => handleRemoveShare(share.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color="#FF4747"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {showShares && sharesLoading && (
                <Text className="text-gray-400 mt-2">Lade Freigaben...</Text>
              )}

              {showShares &&
                !sharesLoading &&
                (!shares || shares.length === 0) && (
                  <Text className="text-gray-400 mt-2">
                    Diese Liste wurde noch nicht geteilt.
                  </Text>
                )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
