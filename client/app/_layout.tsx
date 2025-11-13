import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import LoginScreen from "./login";
import { tokenCache } from "@/cache";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // --- Ambil Publishable Key ---
  const publishableKey = Constants.expoConfig?.extra
    ?.clerkPublishableKey as string;
  if (!publishableKey) {
    console.error("Clerk Publishable Key not found in app.json");
    return null; // Atau tampilkan error
  }

  return (
    // --- Bungkus dengan ClerkProvider ---
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      {/* Tampilkan konten jika sudah login */}
      <SignedIn>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </SignedIn>

      {/* Tampilkan login jika belum login */}
      <SignedOut>
        <LoginScreen />
      </SignedOut>
    </ClerkProvider>
  );
}
