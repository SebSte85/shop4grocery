import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#011A38",
          borderTopWidth: 1,
          borderTopColor: "#0A2547",
          height: 70,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#8B5CF6",
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="lists"
        options={{
          title: "Listen",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Rezepte",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
