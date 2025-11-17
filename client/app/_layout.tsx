import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { tokenCache } from "@/cache";

SplashScreen.preventAutoHideAsync();

// Komponen untuk menangani Redirect Otomatis
function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (isSignedIn && inAuthGroup) {
      // Jika sudah login tapi masih di halaman login, lempar ke home
      router.replace("/(tabs)");
    } else if (!isSignedIn && !inAuthGroup) {
      // Jika belum login tapi mencoba akses home, lempar ke sign-in
      router.replace("/(auth)/sign-in");
    }
  }, [isSignedIn, segments, isLoaded]);

  return <Slot />;
}

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
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <InitialLayout />
    </ClerkProvider>
  );
}
