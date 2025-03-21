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

const registerSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
      await signUp(data.email, data.password);
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

  const handleGoogleSignUp = async () => {
    try {
      console.log("[Register] Google Sign-Up Button clicked");
      setError(null);
      setIsLoading(true);
      console.log("[Register] Calling signInWithGoogle...");
      const result = await signInWithGoogle();
      console.log("[Register] signInWithGoogle result:", result);
    } catch (err) {
      console.error("[Register] Google Sign-Up Error:", err);
      setError(
        "Fehler bei der Google-Registrierung. Bitte versuchen Sie es später erneut."
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
          source={require("@/assets/animations/Signup.json")}
          style={{ height: 200, marginBottom: 20 }}
          autoPlay
          loop
        />
        <Text className="text-white font-rubik text-3xl mb-8 text-center">
          Registrieren
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
