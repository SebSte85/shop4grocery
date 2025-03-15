import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, Link } from "expo-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { AuthError } from "@supabase/supabase-js";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
    email: z.string().email("Ungültige E-Mail-Adresse"),
    password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const getErrorMessage = (error: Error) => {
    if (error instanceof AuthError) {
      switch (error.message) {
        case "User already registered":
          return "Diese E-Mail-Adresse wird bereits verwendet. Bitte melden Sie sich an.";
        case "Password should be at least 6 characters":
          return "Das Passwort muss mindestens 6 Zeichen lang sein";
        default:
          return error.message;
      }
    }
    return error.message;
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      setSuccess(null);
      setIsLoading(true);
      await signUp(data.email, data.password, data.fullName);
      setSuccess(
        "Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mails für die Bestätigung."
      );
      reset();
    } catch (err) {
      console.error("Registration error:", err);
      setError(getErrorMessage(err as Error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black-1 p-4">
      <View className="flex-1 justify-center">
        <Text className="text-white font-rubik text-3xl mb-8 text-center">
          Registrierung
        </Text>

        <View className="space-y-4">
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="Vollständiger Name"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                error={errors.fullName?.message}
                editable={!isLoading}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="E-Mail"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
                editable={!isLoading}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="Passwort"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                error={errors.password?.message}
                editable={!isLoading}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="Passwort bestätigen"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                error={errors.confirmPassword?.message}
                editable={!isLoading}
              />
            )}
          />

          {error && (
            <Text className="text-attention text-sm text-center">{error}</Text>
          )}

          {success && (
            <Text className="text-green-500 text-sm text-center">
              {success}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            className={`bg-primary-1 py-4 rounded-lg ${
              isLoading ? "opacity-50" : ""
            }`}
            disabled={isLoading}
          >
            <Text className="text-white font-rubik text-center">
              {isLoading ? "Registrieren..." : "Registrieren"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8">
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-primary-1 text-center font-rubik">
                Bereits ein Konto? Jetzt anmelden
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}
