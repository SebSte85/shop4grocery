import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/hooks/useAuth";
import { TouchableOpacity } from "react-native-gesture-handler";

export default function ProfileScreen() {
  const { signOut, user } = useAuth();

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
