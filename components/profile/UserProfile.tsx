import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionBadge from "../subscription/SubscriptionBadge";

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const { userData, updateProfile, isLoading, refreshUserData } = useUser();
  const router = useRouter();
  const {
    isSubscribed,
    plan,
    refreshSubscriptionStatus,
    isLoading: isSubscriptionLoading,
    displayStatus,
    needsAttention,
    cancelSubscription,
    subscription,
  } = useSubscription();

  const [isCancelling, setIsCancelling] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Could not sign out. Please try again.");
    }
  };

  const handleSubscription = () => {
    router.push("/subscription");
  };

  const handleRefreshSubscription = async () => {
    try {
      await refreshSubscriptionStatus();
      Alert.alert(
        "Status aktualisiert",
        "Dein Abonnement-Status wurde aktualisiert."
      );
    } catch (error) {
      console.error("Error refreshing subscription:", error);
      Alert.alert(
        "Fehler",
        "Abonnement-Status konnte nicht aktualisiert werden."
      );
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      "Abonnement kündigen",
      "Möchtest du dein Premium-Abonnement wirklich kündigen? Du kannst die Premium-Funktionen dann noch bis zum Ende der aktuellen Abrechnungsperiode nutzen.",
      [
        {
          text: "Abbrechen",
          style: "cancel",
        },
        {
          text: "Kündigen",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCancelling(true);
              await cancelSubscription(false);
              Alert.alert(
                "Abonnement gekündigt",
                "Dein Abonnement wurde erfolgreich gekündigt. Du kannst die Premium-Funktionen noch bis zum Ende der aktuellen Abrechnungsperiode nutzen."
              );
            } catch (error) {
              console.error("Error cancelling subscription:", error);
              Alert.alert(
                "Fehler",
                "Die Kündigung konnte nicht durchgeführt werden. Bitte versuche es später erneut."
              );
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <ScrollView className="flex-1">
        <View className="pt-4 px-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-gray-800 font-rubik">
              Mein Profil
            </Text>
          </View>

          <View className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <View className="p-4">
              <View className="flex-row items-center mb-4">
                <View className="relative">
                  <Image
                    source={
                      userData?.avatar_url
                        ? { uri: userData.avatar_url }
                        : require("@/assets/images/default-avatar.png")
                    }
                    className="w-20 h-20 rounded-full bg-gray-300"
                  />
                  <TouchableOpacity
                    className="absolute bottom-0 right-0 bg-indigo-600 w-8 h-8 rounded-full items-center justify-center"
                    onPress={() => {
                      // Handle profile picture update
                    }}
                  >
                    <MaterialIcons name="edit" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-xl font-semibold text-gray-800 font-rubik">
                    {userData?.full_name ||
                      user?.email?.split("@")[0] ||
                      "Benutzer"}
                  </Text>
                  <Text className="text-gray-500 mb-1 font-rubik">
                    {user?.email}
                  </Text>

                  {/* Abonnement-Status */}
                  <View className="mt-2 flex-row items-center">
                    <SubscriptionBadge
                      plan={plan}
                      displayStatus={displayStatus}
                      needsAttention={needsAttention}
                    />
                    <TouchableOpacity
                      onPress={handleRefreshSubscription}
                      className="ml-2"
                    >
                      {isSubscriptionLoading ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                      ) : (
                        <MaterialIcons
                          name="refresh"
                          size={18}
                          color="#6366f1"
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <TouchableOpacity
              className="p-4 border-b border-gray-100 flex-row items-center"
              onPress={handleSubscription}
            >
              <MaterialIcons name="star" size={24} color="#6366f1" />
              <Text className="text-gray-800 ml-3 font-medium font-rubik">
                {isSubscribed
                  ? "Mein Premium-Abo"
                  : "Premium Funktionen freischalten"}
              </Text>
              <MaterialIcons
                name="arrow-forward-ios"
                size={16}
                color="#9CA3AF"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>

            {isSubscribed &&
              subscription &&
              !subscription.cancel_at_period_end && (
                <TouchableOpacity
                  className="p-4 border-b border-gray-100 flex-row items-center"
                  onPress={handleCancelSubscription}
                  disabled={isCancelling}
                >
                  <MaterialIcons name="cancel" size={24} color="#ef4444" />
                  {isCancelling ? (
                    <ActivityIndicator
                      size="small"
                      color="#ef4444"
                      style={{ marginLeft: 12 }}
                    />
                  ) : (
                    <Text className="text-red-500 ml-3 font-medium font-rubik">
                      Abonnement kündigen
                    </Text>
                  )}
                </TouchableOpacity>
              )}

            {isSubscribed &&
              subscription &&
              subscription.cancel_at_period_end && (
                <View className="p-4 border-b border-gray-100 flex-row items-center">
                  <MaterialIcons name="info" size={24} color="#f59e0b" />
                  <Text className="text-amber-600 ml-3 font-medium font-rubik">
                    Abo endet am{" "}
                    {new Date(
                      subscription.current_period_end
                    ).toLocaleDateString()}
                  </Text>
                </View>
              )}

            {/* Additional menu items */}
            <TouchableOpacity
              className="p-4 border-b border-gray-100 flex-row items-center"
              onPress={() => router.push("/settings")}
            >
              <MaterialIcons name="settings" size={24} color="#6366f1" />
              <Text className="text-gray-800 ml-3 font-medium font-rubik">
                Einstellungen
              </Text>
              <MaterialIcons
                name="arrow-forward-ios"
                size={16}
                color="#9CA3AF"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="p-4 flex-row items-center"
              onPress={handleSignOut}
            >
              <MaterialIcons name="logout" size={24} color="#EF4444" />
              <Text className="text-red-500 ml-3 font-medium font-rubik">
                Ausloggen
              </Text>
            </TouchableOpacity>
          </View>

          <View className="p-4 mb-6">
            <Text className="text-xs text-center text-gray-400 font-rubik">
              Version 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
