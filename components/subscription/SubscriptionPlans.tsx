"use client";

import React, { useEffect, useState } from "react";
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
  const {
    isSubscribed,
    subscription,
    plan,
    subscribe,
    isSubscribing,
    cancelSubscription,
  } = useSubscription();
  const { isInitialized, isLoading: isStripeLoading } = useInitStripe();
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  // Zustand für die Kündigung hinzufügen
  const [isCancelling, setIsCancelling] = useState(false);

  // Erfolgreicher Checkout oder Redirect nach 3D Secure
  useEffect(() => {
    // Nach erfolgreicher Zahlung oder Rückkehr zur App
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
      console.log(`Starting subscription process for price ID: ${priceId}`);

      const result = await subscribe(priceId);
      console.log(`Subscription result:`, JSON.stringify(result));

      if (result.status === "succeeded") {
        // PaymentSheet erfolgreich bearbeitet
        // Subscription wird asynchron über Webhooks aktiviert
        // Wir laden den Status neu, um das UI zu aktualisieren
        queryClient.invalidateQueries({ queryKey: ["subscription"] });

        // Force refresh the subscription status multiple times to ensure it's up to date
        // This helps in case webhook processing is delayed
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
        }, 2000);

        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
        }, 5000);

        Alert.alert(
          "Zahlung erfolgreich",
          "Vielen Dank für deine Zahlung! Dein Premium-Abo wird in Kürze aktiviert.",
          [{ text: "OK" }]
        );
      } else if (result.status === "canceled") {
        // Make sure subscription status is refreshed after cancellation
        queryClient.invalidateQueries({ queryKey: ["subscription"] });

        Alert.alert(
          "Abonnement abgebrochen",
          "Du hast den Zahlungsprozess abgebrochen. Du kannst es jederzeit erneut versuchen.",
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

  // Funktion zur Abonnement-Kündigung
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
              await cancelSubscription(false); // false = kündigen zum Ende der Abrechnungsperiode
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
      const endDate = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString()
        : "unbekannt";

      // Prüfen, ob das Abonnement bereits zur Kündigung vorgemerkt ist
      const isCanceled = subscription?.cancel_at_period_end;

      return (
        <View className="mb-6 p-4 bg-primary-1/10 rounded-lg border border-primary-1/30">
          <Text className="text-lg font-semibold text-primary-1 mb-2">
            Premium-Abonnement aktiv
          </Text>
          <Text className="text-sm text-gray-300 mb-2">
            Dein {plan === "premium" ? "Premium" : ""} Abonnement ist aktiv bis{" "}
            {endDate}
          </Text>

          {isCanceled ? (
            <Text className="text-sm text-orange-400 mt-2">
              Dein Abonnement wurde gekündigt und endet am {endDate}.
            </Text>
          ) : (
            <TouchableOpacity
              onPress={handleCancelSubscription}
              disabled={isCancelling}
              className="mt-3 py-2 px-4 bg-black-2 border border-red-500 rounded-lg"
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text className="text-red-500 text-center font-medium font-rubik">
                  Abonnement kündigen
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    } else if (subscription && subscription.status === "incomplete") {
      // FIX: Show a special message for incomplete subscriptions
      return (
        <View className="mb-6 p-4 bg-orange-900/20 rounded-lg border border-orange-500/30">
          <Text className="text-lg font-semibold text-orange-400 mb-2">
            Abonnement unvollständig
          </Text>
          <Text className="text-sm text-gray-300 mb-2">
            Dein Abonnement konnte nicht aktiviert werden, da der
            Zahlungsprozess nicht abgeschlossen wurde.
          </Text>
          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={isSubscribing}
            className="mt-3 py-2 px-4 bg-black-2 border border-orange-500 rounded-lg"
          >
            {isSubscribing ? (
              <ActivityIndicator size="small" color="#f97316" />
            ) : (
              <Text className="text-orange-500 text-center font-medium font-rubik">
                Zahlungsprozess abschließen
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="flex-1 bg-black-1 px-4 pt-6"
    >
      <View className="mb-8">
        <Text className="text-2xl font-bold text-white mb-2 font-rubik">
          Premium-Funktionen freischalten
        </Text>
        <Text className="text-base text-gray-300 mb-6 font-rubik">
          Genieße alle Premium-Funktionen mit unserem Jahresabonnement.
        </Text>

        {renderSubscriptionStatus()}

        <View className="bg-black-2 rounded-xl shadow-md overflow-hidden mb-8 border border-gray-700">
          <View className="p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-white font-rubik">
                Jahresabonnement
              </Text>
              <View className="bg-primary-1/20 px-3 py-1 rounded-full">
                <Text className="text-sm font-semibold text-primary-1 font-rubik">
                  Premium
                </Text>
              </View>
            </View>

            <Text className="text-2xl font-bold text-white mb-4 font-rubik">
              4,99 € / Jahr
            </Text>

            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <Text className="text-green-500 mr-2">✓</Text>
                <Text className="text-gray-300 font-rubik">
                  Unbegrenzte Einkaufslisten
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Text className="text-green-500 mr-2">✓</Text>
                <Text className="text-gray-300 font-rubik">
                  Unbegrenzte Artikel pro Liste
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Text className="text-green-500 mr-2">✓</Text>
                <Text className="text-gray-300 font-rubik">
                  Teilen von Listen mit anderen
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Text className="text-green-500 mr-2">✓</Text>
                <Text className="text-gray-300 font-rubik">
                  365 Tage Verlauf
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-green-500 mr-2">✓</Text>
                <Text className="text-gray-300 font-rubik">Keine Werbung</Text>
              </View>
            </View>

            {!isSubscribed && (
              <TouchableOpacity
                className={`py-3 px-4 rounded-lg ${
                  isSubscribing
                    ? "bg-gray-600"
                    : "bg-primary-1 active:bg-primary-1/80"
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
          <Text className="text-sm text-gray-400 mb-2 font-rubik">
            • Alle Zahlungen werden über Stripe verarbeitet
          </Text>
          <Text className="text-sm text-gray-400 mb-2 font-rubik">
            • Das Abonnement verlängert sich automatisch nach einem Jahr
          </Text>
          <Text className="text-sm text-gray-400 font-rubik">
            • Abonnements können jederzeit in den Einstellungen gekündigt werden
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
