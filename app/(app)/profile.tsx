import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/hooks/useAuth";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSubscription } from "@/hooks/useSubscription";

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const { isSubscribed, plan } = useSubscription();

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
        className="bg-red-500 p-4 rounded-xl items-center mt-auto"
      >
        <Text variant="semibold" className="uppercase text-white">
          Abmelden
        </Text>
      </TouchableOpacity>
    </View>
  );
}
