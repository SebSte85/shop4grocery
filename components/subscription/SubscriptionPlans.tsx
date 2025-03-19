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
import * as WebBrowser from "expo-web-browser";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SubscriptionPlans() {
  const { isSubscribed, subscription, plan, subscribe, isSubscribing } =
    useSubscription();
  const { isLoading: isStripeLoading } = useInitStripe();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Erfolgreicher Checkout
  useEffect(() => {
    if (params.success === "true" && params.session_id) {
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
  }, [params]);

  const handleSubscribe = async () => {
    try {
      const priceId = SUBSCRIPTION_PRICES.YEARLY;
      console.log(`Subscribing with priceId: ${priceId}`);

      const sessionData = await subscribe(priceId);
      console.log(`Session data received:`, JSON.stringify(sessionData));

      if (sessionData?.url) {
        console.log(`Opening browser with URL: ${sessionData.url}`);
        try {
          // URL im Browser öffnen
          const result = await WebBrowser.openBrowserAsync(sessionData.url);
          console.log(`Browser result:`, JSON.stringify(result));
        } catch (browserError: any) {
          console.error(`Error opening browser:`, browserError);
          Alert.alert(
            "Browser-Fehler",
            "Die Zahlungsseite konnte nicht geöffnet werden. Fehler: " +
              browserError.message,
            [{ text: "OK" }]
          );
        }
      } else {
        console.error(`No URL received in session data`);
        Alert.alert(
          "Fehler",
          "Keine gültige Zahlungs-URL erhalten. Bitte versuche es später erneut.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Fehler beim Abonnieren:", error);
      Alert.alert(
        "Fehler",
        "Beim Erstellen des Abonnements ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
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

  return (
    <ScrollView className="flex-1 bg-black-1 p-4">
      <View className="py-4">
        <Text className="text-white font-rubik-bold text-2xl text-center mb-2">
          Premium-Funktionen freischalten
        </Text>
        <Text className="text-gray-400 font-rubik text-center mb-6">
          Mit Premium erhältst du Zugriff auf alle Funktionen
        </Text>

        {isSubscribed && (
          <View className="bg-gradient-to-br from-violet-800 to-purple-600 p-4 rounded-lg mb-6">
            <Text className="text-white font-rubik-bold text-lg">
              Du hast bereits ein {plan === "premium" ? "Premium" : ""}{" "}
              Abonnement!
            </Text>
            <Text className="text-white font-rubik mt-2">
              Nächste Abrechnung:{" "}
              {new Date(
                subscription?.current_period_end || ""
              ).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Free Plan */}
        <View className="bg-black-2 rounded-lg p-4 mb-4">
          <Text className="text-white font-rubik-bold text-xl">Kostenlos</Text>
          <Text className="text-primary-1 font-rubik-bold text-2xl mt-2">
            €0.00
          </Text>
          <Text className="text-gray-400 font-rubik mt-4">Enthält:</Text>
          <View className="mt-2 space-y-2">
            <FeatureItem text="Max. 3 Einkaufslisten" included />
            <FeatureItem text="Max. 20 Artikel pro Liste" included />
            <FeatureItem text="Kategorisierung" included />
            <FeatureItem text="Einkaufshistorie für 7 Tage" included />
            <FeatureItem text="Listen teilen" included={false} />
            <FeatureItem text="Kein Werbung" included={false} />
          </View>
          <Text className="text-gray-400 font-rubik mt-4 text-center">
            {plan === "free" ? "Dein aktueller Plan" : ""}
          </Text>
        </View>

        {/* Premium Plan */}
        <View className="bg-gradient-to-br from-violet-900 to-purple-900 rounded-lg p-4 mb-4 border border-primary-1">
          <View className="bg-primary-1 self-start px-3 py-1 rounded-full mb-2">
            <Text className="text-white font-rubik-bold text-xs">
              EMPFOHLEN
            </Text>
          </View>
          <Text className="text-white font-rubik-bold text-xl">Premium</Text>
          <Text className="text-primary-1 font-rubik-bold text-2xl mt-2">
            €4.99
            <Text className="text-gray-400 font-rubik text-sm"> / Jahr</Text>
          </Text>
          <Text className="text-gray-300 font-rubik mt-4">Enthält:</Text>
          <View className="mt-2 space-y-2">
            <FeatureItem text="Unbegrenzte Einkaufslisten" included />
            <FeatureItem text="Unbegrenzte Artikel pro Liste" included />
            <FeatureItem text="Kategorisierung" included />
            <FeatureItem text="Komplette Einkaufshistorie" included />
            <FeatureItem text="Listen teilen mit Freunden" included />
            <FeatureItem text="Keine Werbung" included />
            <FeatureItem text="Premium Support" included />
          </View>
          <TouchableOpacity
            className={`bg-primary-1 py-4 rounded-lg mt-6 ${
              isSubscribing ? "opacity-70" : ""
            }`}
            onPress={handleSubscribe}
            disabled={isSubscribing || isSubscribed}
          >
            <Text className="text-white font-rubik-bold text-center">
              {isSubscribing
                ? "Verarbeitung..."
                : isSubscribed
                ? "Bereits abonniert"
                : "Jetzt upgraden"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function FeatureItem({ text, included }: { text: string; included: boolean }) {
  return (
    <View className="flex-row items-center">
      <View
        className={`w-5 h-5 rounded-full mr-2 items-center justify-center ${
          included ? "bg-primary-1" : "bg-gray-700"
        }`}
      >
        {included ? (
          <Text className="text-white text-xs">✓</Text>
        ) : (
          <Text className="text-white text-xs">✗</Text>
        )}
      </View>
      <Text
        className={`font-rubik ${included ? "text-white" : "text-gray-500"}`}
      >
        {text}
      </Text>
    </View>
  );
}
