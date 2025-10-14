import Constants from "expo-constants";
import { Platform } from "react-native";

let apiUrl: string;

// Cek apakah kode berjalan di lingkungan web
if (Platform.OS === "web") {
  // Untuk web, gunakan hostname dari URL browser.
  apiUrl = `http://${window.location.hostname}:3000`;
} else {
  // Untuk mobile (iOS/Android), gunakan metode hostUri dari Expo Constants.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    apiUrl = `http://${hostUri.split(":")[0]}:3000`;
  } else {
    // Fallback jika terjadi kesalahan
    apiUrl = "http://localhost:3000";
  }
}

export const API_URL = apiUrl;

console.log(`Platform: ${Platform.OS}, API URL is set to: ${API_URL}`);
