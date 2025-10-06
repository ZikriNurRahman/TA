import Constants from "expo-constants";
import { Platform } from "react-native";

// Fungsi untuk mendapatkan alamat IP lokal dari manifest Expo
const getLocalIp = () => {
  // Ambil host URI dari manifest. Ini adalah alamat server development.
  // Contoh: '192.168.1.5:8081'
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    return hostUri.split(":")[0];
  }
  return null;
};

// Logika untuk menentukan URL API
let apiUrl = "http://localhost:3000"; // Default untuk web

if (Platform.OS !== "web") {
  const localIp = getLocalIp();
  if (localIp) {
    apiUrl = `http://${localIp}:3000`;
  } else {
    // Fallback jika IP tidak terdeteksi
    console.warn(
      "Could not detect local IP address for API connection. Please ensure you are running in a development environment."
    );
    // Anda bisa set IP manual di sini jika diperlukan untuk situasi darurat
    // apiUrl = 'http://192.168.1.YOUR_IP:3000';
  }
}

export const API_URL = apiUrl;

console.log("API URL is set to:", API_URL);
