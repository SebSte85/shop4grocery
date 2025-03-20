"use client";

import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSubscription } from "@/hooks/useSubscription";
import { SUBSCRIPTION_PRICES } from "@/services/stripeService";
import { useInitStripe } from "@/hooks/useInitStripe";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

export default function SubscriptionPlans() {
  const { isSubscribed, subscription, plan, subscribe, isSubscribing } =
    useSubscription();
  const { isInitialized, isLoading: isStripeLoading } = useInitStripe();
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  // Erfolgreicher Checkout oder Redirect nach 3D Secure
  useEffect(() => {
    if (params.success === "true") {
      // Invalidiere den Subscription-Cache, damit der aktuelle Status neu geladen wird
      queryClient.invalidateQueries({ queryKey: ["subscription"] });

      Alert.alert(
        "Abonnement erfolgreich",
        "Vielen Dank für dein Abonnement! Du hast jetzt Zugriff auf alle Premium-Funktionen.",
        [{ text: "OK" }]
      );
    } else if (params.canceled === "true") {
      Alert.alert(
        "Abonnement abgebrochen",
        "Du hast den Checkout-Prozess abgebrochen. Du kannst es jederzeit erneut versuchen.",
        [{ text: "OK" }]
      );
    }
  }, [params, queryClient]);

  const handleSubscribe = async () => {
    try {
      if (!isInitialized) {
        Alert.alert(
          "Fehler",
          "Stripe wurde noch nicht initialisiert. Bitte versuche es später erneut.",
          [{ text: "OK" }]
        );
        return;
      }

      const priceId = SUBSCRIPTION_PRICES.YEARLY;
      console.log(`Subscribing with priceId: ${priceId}`);

      const result = await subscribe(priceId);
      console.log(`Subscription result:`, JSON.stringify(result));

      if (result.status === "succeeded") {
        // Die PaymentSheet hat die Zahlung erfolgreich verarbeitet
        // Der Abonnement-Status wird über Webhooks aktualisiert
        queryClient.invalidateQueries({ queryKey: ["subscription"] });

        Alert.alert(
          "Abonnement erfolgreich",
          "Vielen Dank für dein Abonnement! Du hast jetzt Zugriff auf alle Premium-Funktionen.",
          [{ text: "OK" }]
        );
      } else if (result.status === "canceled") {
        Alert.alert(
          "Abonnement abgebrochen",
          "Du hast den Checkout-Prozess abgebrochen. Du kannst es jederzeit erneut versuchen.",
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      console.error("Fehler beim Abonnieren:", error);
      Alert.alert(
        "Fehler",
        "Beim Erstellen des Abonnements ist ein Fehler aufgetreten: " +
          error.message,
        [{ text: "OK" }]
      );
    }
  };

  if (isStripeLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="mt-4 text-gray-400 font-rubik">
          Initialisiere Zahlungsdienst...
        </Text>
      </View>
    );
  }

  // Zeige den aktuellen Abonnement-Status
  const renderSubscriptionStatus = () => {
    if (isSubscribed) {
      return (
        <View className="mb-6 p-4 bg-indigo-50 rounded-lg">
          <Text className="text-lg font-semibold text-indigo-800 mb-2">
            Premium-Abonnement aktiv
          </Text>
          <Text className="text-sm text-indigo-700">
            Dein {plan === "premium" ? "Premium" : ""} Abonnement ist aktiv bis{" "}
            {subscription?.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString()
              : "unbekannt"}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="flex-1 bg-white px-4 pt-6"
    >
      <View className="mb-8">
        <Text className="text-2xl font-bold text-gray-800 mb-2 font-rubik">
          Premium-Funktionen freischalten
        </Text>
        <Text className="text-base text-gray-600 mb-6 font-rubik">
          Genieße alle Premium-Funktionen mit unserem Jahresabonnement.
        </Text>

        {renderSubscriptionStatus()}

        <View className="bg-white rounded-xl shadow-md overflow-hidden mb-8 border border-gray-200">
          <View className="p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800 font-rubik">
                Jahresabonnement
              </Text>
              <View className="bg-indigo-100 px-3 py-1 rounded-full">
                <Text className="text-sm font-semibold text-indigo-700 font-rubik">
                  Premium
                </Text>
              </View>
            </View>

            <Text className="text-2xl font-bold text-gray-900 mb-4 font-rubik">
              4,99 € / Jahr
            </Text>

            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <Text className="text-green-600 mr-2">✓</Text>
                <Text className="text-gray-700 font-rubik">
                  Unbegrenzte Einkaufslisten
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Text className="text-green-600 mr-2">✓</Text>
                <Text className="text-gray-700 font-rubik">
                  Unbegrenzte Artikel pro Liste
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Text className="text-green-600 mr-2">✓</Text>
                <Text className="text-gray-700 font-rubik">
                  Teilen von Listen mit anderen
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Text className="text-green-600 mr-2">✓</Text>
                <Text className="text-gray-700 font-rubik">
                  365 Tage Verlauf
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-green-600 mr-2">✓</Text>
                <Text className="text-gray-700 font-rubik">Keine Werbung</Text>
              </View>
            </View>

            {!isSubscribed && (
              <TouchableOpacity
                className={`py-3 px-4 rounded-lg ${
                  isSubscribing
                    ? "bg-gray-400"
                    : "bg-indigo-600 active:bg-indigo-700"
                }`}
                onPress={handleSubscribe}
                disabled={isSubscribing}
              >
                {isSubscribing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-center font-semibold font-rubik">
                    Jetzt abonnieren
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm text-gray-500 mb-2 font-rubik">
            • Alle Zahlungen werden über Stripe verarbeitet
          </Text>
          <Text className="text-sm text-gray-500 mb-2 font-rubik">
            • Das Abonnement verlängert sich automatisch nach einem Jahr
          </Text>
          <Text className="text-sm text-gray-500 font-rubik">
            • Abonnements können jederzeit in den Einstellungen gekündigt werden
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
