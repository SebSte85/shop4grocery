import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { useCreateList } from "@/hooks/useLists";
import { Ionicons } from "@expo/vector-icons";

const listSchema = z.object({
  name: z.string().min(1, "Bitte geben Sie einen Namen ein"),
});

type ListFormData = z.infer<typeof listSchema>;

export default function NewListScreen() {
  const router = useRouter();
  const createList = useCreateList();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ListFormData>({
    resolver: zodResolver(listSchema),
  });

  const onSubmit = async (data: ListFormData) => {
    try {
      setError(null);
      await createList.mutateAsync(data);
      router.back(); // Zurück zur Übersicht
    } catch (err) {
      setError(
        "Liste konnte nicht erstellt werden. Bitte versuchen Sie es erneut."
      );
    }
  };

  return (
    <View className="flex-1 bg-black-1">
      {/* Header */}
      <View className="p-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-rubik text-xl flex-1">Neue Liste</Text>
      </View>

      {/* Content */}
      <View className="flex-1 p-4">
        <View className="space-y-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="Name der Liste"
                value={value}
                onChangeText={onChange}
                autoCapitalize="sentences"
                error={errors.name?.message}
              />
            )}
          />

          {error && (
            <Text className="text-attention text-sm text-center">{error}</Text>
          )}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            className="bg-primary-1 py-4 rounded-lg mt-4"
          >
            <Text className="text-white font-rubik text-center">
              Liste erstellen
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
