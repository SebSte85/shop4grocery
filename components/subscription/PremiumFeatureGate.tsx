"use client";

import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useSubscription } from "@/hooks/useSubscription";
import { useRouter } from "expo-router";
import { SubscriptionFeatures } from "@/types/subscription.types";

interface PremiumFeatureGateProps {
  feature: keyof SubscriptionFeatures;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function PremiumFeatureGate({
  feature,
  children,
  fallback,
}: PremiumFeatureGateProps) {
  const [showModal, setShowModal] = React.useState(false);
  const { canUseFeature, isSubscribed } = useSubscription();
  const router = useRouter();

  // If user can use the feature, just render the children
  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  // If a fallback is provided, use that instead
  if (fallback) {
    return <>{fallback}</>;
  }

  // Otherwise, show a button that will show upgrade modal
  const handlePress = () => {
    setShowModal(true);
  };

  const navigateToSubscription = () => {
    setShowModal(false);
    router.push("/(app)/subscription");
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} className="w-full">
        <View className="bg-black-2 p-4 rounded-lg border border-primary-1 items-center">
          <Text className="text-primary-1 font-rubik-semibold">
            Premium Funktion 🌟
          </Text>
          <Text className="text-gray-400 font-rubik text-center mt-2">
            Upgrade auf Premium, um diese Funktion zu nutzen
          </Text>
          <TouchableOpacity
            className="mt-4 bg-primary-1 px-6 py-2 rounded-full"
            onPress={navigateToSubscription}
          >
            <Text className="text-white font-rubik-semibold">
              Jetzt upgraden
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
          <View className="bg-black-2 p-6 rounded-xl w-full max-w-sm">
            <Text className="text-white font-rubik-bold text-xl text-center">
              Premium-Funktion
            </Text>

            <Text className="text-gray-300 font-rubik mt-4 text-center">
              Diese Funktion ist nur für Premium-Mitglieder verfügbar. Upgrade
              jetzt, um alle Funktionen freizuschalten.
            </Text>

            <View className="flex-row mt-6 space-x-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg bg-black-1 border border-gray-700"
                onPress={() => setShowModal(false)}
              >
                <Text className="text-gray-300 font-rubik text-center">
                  Später
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 py-3 rounded-lg bg-primary-1"
                onPress={navigateToSubscription}
              >
                <Text className="text-white font-rubik-semibold text-center">
                  Upgrade
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
