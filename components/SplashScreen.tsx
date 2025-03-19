import React from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SplashScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Image
        source={require("@/assets/images/logo-full.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#011A38", // Using background color from theme
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: width * 0.8,
    height: width * 0.8 * 0.5, // Assuming a 2:1 aspect ratio, adjust if needed
  },
});
