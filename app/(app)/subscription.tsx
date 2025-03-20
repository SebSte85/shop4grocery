import React from "react";
import { ScrollView } from "react-native";
import { Stack } from "expo-router";
import SubscriptionPlans from "@/components/subscription/SubscriptionPlans";

export default function SubscriptionScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Premium Funktionen",
          headerTitleAlign: "center",
          headerShown: true,
          headerStyle: {
            backgroundColor: "#011A38",
          },
          headerTintColor: "#fff",
          presentation: "card",
        }}
      />
      <SubscriptionPlans />
    </>
  );
}
