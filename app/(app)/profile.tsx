import {
  View,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity as RNTouchableOpacity,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/hooks/useAuth";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";

export default function ProfileScreen() {
  const { signOut, user, deleteAccount } = useAuth();
  const { isSubscribed, plan, subscription, cancelSubscription } =
    useSubscription();
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Konto löschen",
      "Bist du sicher, dass du dein Konto löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden." +
        (isSubscribed
          ? "\n\nDein Premium-Abonnement wird zum Ende der aktuellen Abrechnungsperiode gekündigt."
          : ""),
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () => {
            // Show custom password modal instead of Alert.prompt
            setShowPasswordModal(true);
          },
        },
      ]
    );
  };

  const confirmAccountDeletion = async () => {
    if (!password) {
      Alert.alert("Fehler", "Bitte gib dein Passwort ein.");
      return;
    }

    try {
      setIsDeleting(true);
      setShowPasswordModal(false);
      await deleteAccount(
        password,
        isSubscribed ? cancelSubscription : undefined
      );
      // The signOut function in deleteAccount will redirect the user
    } catch (error) {
      setIsDeleting(false);
      Alert.alert(
        "Fehler",
        error instanceof Error
          ? error.message
          : "Es ist ein unbekannter Fehler aufgetreten."
      );
    }
  };

  return (
    <View className="flex-1 bg-black-1 p-4">
      <Text variant="semibold" className="text-3xl text-primary-1 mb-8">
        Profil
      </Text>

      <View className="bg-black-2 p-4 rounded-xl mb-4">
        <Text variant="medium" className="mb-2">
          E-Mail
        </Text>
        <Text variant="light" className="text-black-3">
          {user?.email}
        </Text>
      </View>

      {/* Premium Status Block */}
      <TouchableOpacity
        onPress={() => router.push("/subscription")}
        className="bg-black-2 p-4 rounded-xl mb-4"
      >
        <View className="flex-row justify-between items-center">
          <View>
            <Text variant="medium" className="mb-2">
              Abo-Status
            </Text>
            <Text
              variant="light"
              className={isSubscribed ? "text-purple-500" : "text-black-3"}
            >
              {isSubscribed ? "Premium" : "Kostenlos"}
            </Text>
          </View>
          <View className="flex-row items-center">
            {isSubscribed && (
              <View className="bg-purple-500 py-1 px-3 rounded-full mr-2">
                <Text variant="semibold" className="text-xs text-white">
                  PREMIUM
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => signOut()}
        className="bg-black-2 p-4 rounded-xl items-center mt-auto mb-4"
      >
        <Text variant="semibold" className="uppercase text-white">
          Abmelden
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDeleteAccount}
        className="bg-attention p-4 rounded-xl items-center"
        disabled={isDeleting}
      >
        <Text variant="semibold" className="uppercase text-white">
          {isDeleting ? "Wird gelöscht..." : "Konto löschen"}
        </Text>
      </TouchableOpacity>

      {/* Password confirmation modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <RNTouchableOpacity
            activeOpacity={1}
            style={{ flex: 1 }}
            onPress={() => {
              setShowPasswordModal(false);
              setPassword("");
            }}
          >
            <View className="flex-1 justify-center items-center bg-black-1/80">
              <RNTouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View className="bg-black-2 p-5 rounded-xl w-[90%] max-w-md">
                  <Text variant="semibold" className="text-lg text-white mb-3">
                    Passwort bestätigen
                  </Text>
                  <Text variant="light" className="text-white mb-4">
                    Bitte gib dein Passwort ein, um die Löschung zu bestätigen
                  </Text>

                  <TextInput
                    className="bg-black-1 border border-black-3 rounded-lg px-4 py-3 mb-4 text-white"
                    placeholder="Passwort eingeben"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={confirmAccountDeletion}
                  />

                  <View className="flex-row justify-end" style={{ gap: 12 }}>
                    <RNTouchableOpacity
                      onPress={() => {
                        setShowPasswordModal(false);
                        setPassword("");
                      }}
                      className="px-5 py-3 rounded-lg"
                      activeOpacity={0.7}
                    >
                      <Text className="text-black-3">Abbrechen</Text>
                    </RNTouchableOpacity>

                    <RNTouchableOpacity
                      onPress={confirmAccountDeletion}
                      className="bg-attention px-5 py-3 rounded-lg"
                      activeOpacity={0.7}
                    >
                      <Text variant="medium" className="text-white">
                        Bestätigen
                      </Text>
                    </RNTouchableOpacity>
                  </View>
                </View>
              </RNTouchableOpacity>
            </View>
          </RNTouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
