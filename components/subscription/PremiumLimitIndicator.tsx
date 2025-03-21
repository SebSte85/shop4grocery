import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionFeatures } from "@/types/subscription.types";

interface PremiumLimitIndicatorProps {
  featureName: keyof SubscriptionFeatures;
  currentCount: number;
  label?: string;
}

export default function PremiumLimitIndicator({
  featureName,
  currentCount,
  label = "Listen",
}: PremiumLimitIndicatorProps) {
  const { plan, getFeatures } = useSubscription();

  const isPremium = plan === "premium";
  const features = getFeatures();
  const limit = features[featureName] as number;
  // Show red when at or exceeding the limit
  const isAtOrOverLimit = currentCount >= limit;

  // Premium users don't need to see the limit indicator
  if (isPremium) {
    return null;
  }

  return (
    <View
      className={`px-2 py-1 rounded-full ${
        isAtOrOverLimit ? "bg-red-900/30" : "bg-gray-700/30"
      }`}
    >
      <Text
        className={`text-xs ${
          isAtOrOverLimit ? "text-red-500" : "text-gray-400"
        }`}
      >
        {currentCount}/{limit}
      </Text>
    </View>
  );
}
