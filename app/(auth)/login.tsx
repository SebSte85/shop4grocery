import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, Link } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { AuthError } from "@supabase/supabase-js";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const getErrorMessage = (error: AuthError) => {
    switch (error.message) {
      case "Invalid login credentials":
        return "E-Mail oder Passwort ist falsch";
      case "Email not confirmed":
        return "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse";
      default:
        return "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      setIsLoading(true);
      await signIn(data.email, data.password);
    } catch (err) {
      setError(getErrorMessage(err as AuthError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setError(
        "Fehler bei der Google-Anmeldung. Bitte versuchen Sie es später erneut."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black-1 p-4">
      <View className="flex-1 justify-center">
        <LottieView
          ref={animationRef}
          source={require("@/assets/animations/Signin.json")}
          style={{ height: 200, marginBottom: 20 }}
          autoPlay
          loop
        />
        <Text className="text-white font-rubik text-3xl mb-8 text-center">
          Anmelden
        </Text>

        <View className="space-y-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <View className="relative">
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#8b5cf6"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 14,
                    zIndex: 10,
                  }}
                />
                <Input
                  placeholder="E-Mail"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  editable={!isLoading}
                  className="font-rubik-semibold mb-2 pl-10"
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <View className="relative">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#8b5cf6"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 14,
                    zIndex: 10,
                  }}
                />
                <Input
                  placeholder="Passwort"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  error={errors.password?.message}
                  editable={!isLoading}
                  className="font-rubik-semibold mb-2 pl-10"
                />
              </View>
            )}
          />

          {error && (
            <Text className="text-attention text-sm text-center">{error}</Text>
          )}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            className={`bg-primary-1 py-4 rounded-lg ${
              isLoading ? "opacity-50" : ""
            }`}
            disabled={isLoading}
          >
            <Text className="text-white font-rubik text-center">
              {isLoading ? "Anmelden..." : "Anmelden"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoogleSignIn}
            className={`bg-black-2 py-4 rounded-lg flex-row justify-center items-center ${
              isLoading ? "opacity-50" : ""
            }`}
            disabled={isLoading}
          >
            <Ionicons
              name="logo-google"
              size={20}
              color="white"
              style={{ marginRight: 10 }}
            />
            <Text className="text-white font-rubik text-center">
              {isLoading ? "Anmelden..." : "Mit Google anmelden"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8">
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-primary-1 text-center font-rubik">
                Noch kein Konto? Jetzt registrieren
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}
