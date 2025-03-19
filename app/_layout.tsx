import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GlobalProvider } from "@/lib/global-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SplashScreen as CustomSplashScreen } from "@/components/SplashScreen";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { useSegments, useRouter } from "expo-router";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Konfiguriere die Deep Link-Optionen für die gesamte App
const linking = {
  prefixes: ["korbklick://", "https://korbklick.de"],
  config: {
    screens: {
      "(auth)": {
        screens: {
          callback: "auth/callback",
          login: "login",
          register: "register",
        },
      },
      "(app)": {
        screens: {
          lists: "lists",
        },
      },
      index: "*",
    },
  },
};

// URL-Prefix für Deep Links
const prefix = Linking.createURL("/");

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  // Deep Link Konfiguration
  useEffect(() => {
    // Deep Link-Handler für die gesamte App
    const handleDeepLink = (event: { url: string }) => {
      try {
        // Verarbeite den Deep Link
        if (event.url.includes("auth/callback")) {
          // Parameter aus der URL extrahieren
          const url = new URL(event.url);
          const params = Object.fromEntries(url.searchParams.entries());

          // Fragmentparameter prüfen (nach #)
          if (event.url.includes("#")) {
            const hashParams = event.url
              .split("#")[1]
              .split("&")
              .reduce((acc, part) => {
                const [key, value] = part.split("=");
                if (key && value) {
                  acc[key] = decodeURIComponent(value);
                }
                return acc;
              }, {} as Record<string, string>);
          }
        }
      } catch (error) {}
    };

    // Listener für Deep Links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Initiale URL prüfen
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [segments, router]);

  useEffect(() => {
    async function prepare() {
      try {
        // Hide the native splash screen
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        // Mark app as ready after fonts are loaded
        if (fontsLoaded) {
          setAppIsReady(true);
        }
      }
    }

    if (fontsLoaded) {
      prepare();
    }
  }, [fontsLoaded]);

  if (!appIsReady) {
    return <CustomSplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </GlobalProvider>
    </GestureHandlerRootView>
  );
}
