import Constants from "expo-constants";
import { Platform } from "react-native";

let apiUrl: string;

// `process.env.NODE_ENV` akan bernilai 'development' saat Anda menjalankan `npx expo start`
// dan akan bernilai 'production' saat Anda membuat build dengan `eas build`.
if (process.env.NODE_ENV === "development") {
  // --- KODE UNTUK DEVELOPMENT ---
  if (Platform.OS === "web") {
    // Untuk web, gunakan hostname dari URL browser.
    apiUrl = `http://${window.location.hostname}:3000`;
  } else {
    // Untuk mobile (iOS/Android), gunakan metode hostUri dari Expo Constants.
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      apiUrl = `http://${hostUri.split(":")[0]}:3000`;
    } else {
      apiUrl = "http://localhost:3000";
    }
  }
} else {
  // --- KODE UNTUK PRODUKSI ---
  // Ambil URL dari app.json yang sudah kita set sebelumnya.
  apiUrl = Constants.expoConfig?.extra?.apiUrl as string;
}

export const API_URL = apiUrl;

console.log(`Platform: ${Platform.OS}, API URL is set to: ${API_URL}`);
