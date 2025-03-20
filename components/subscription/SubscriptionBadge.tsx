import React from "react";
import { View, Text } from "react-native";

interface SubscriptionBadgeProps {
  plan: string;
  displayStatus?: string;
  needsAttention?: boolean;
}

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  plan,
  displayStatus = "inactive",
  needsAttention = false,
}) => {
  // Badge-Styling je nach Abonnement-Typ und Status
  const getBadgeStyle = () => {
    // Wenn Aufmerksamkeit benötigt wird (z.B. past_due), Warnstil anzeigen
    if (needsAttention) {
      return {
        container:
          "bg-yellow-100 border border-yellow-300 px-2 py-1 rounded-md",
        text: "text-yellow-700 text-xs font-medium font-rubik",
      };
    }

    // Status-basierte Stile
    if (displayStatus === "pending") {
      return {
        container: "bg-blue-100 border border-blue-300 px-2 py-1 rounded-md",
        text: "text-blue-700 text-xs font-medium font-rubik",
      };
    }

    // Plan-basierte Stile
    switch (plan) {
      case "premium":
        // Premium-Abonnement: Lila/Indigo Farben
        return {
          container:
            "bg-indigo-100 border border-indigo-300 px-2 py-1 rounded-md",
          text: "text-indigo-700 text-xs font-medium font-rubik",
        };
      case "free":
      default:
        // Kostenloses Konto: Grau
        return {
          container: "bg-gray-100 border border-gray-300 px-2 py-1 rounded-md",
          text: "text-gray-700 text-xs font-medium font-rubik",
        };
    }
  };

  // Text je nach Abonnement-Typ und Status
  const getBadgeText = () => {
    // Wenn Aufmerksamkeit benötigt wird
    if (needsAttention) {
      return "Zahlung fällig";
    }

    // Status-basierte Texte
    if (displayStatus === "pending") {
      return "Zahlung ausstehend";
    }

    // Plan-basierte Texte
    switch (plan) {
      case "premium":
        return "Premium";
      case "free":
      default:
        return "Kostenloses Konto";
    }
  };

  const style = getBadgeStyle();

  return (
    <View className={style.container}>
      <Text className={style.text}>{getBadgeText()}</Text>
    </View>
  );
};

export default SubscriptionBadge;
