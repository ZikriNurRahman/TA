import { Text, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useEffect, useState } from "react";
import { styles } from "../../styles/styles";

export default function HomeScreen() {
  // State untuk menyimpan pesan dari server
  const [serverMessage, setServerMessage] = useState("Sedang memuat...");

  useEffect(() => {
    // Fungsi untuk mengambil data dari server
    const fetchData = async () => {
      try {
        // Ganti 'localhost' dengan alamat IP komputer Anda jika menjalankan di perangkat fisik
        const response = await fetch("http://localhost:3000/");
        const data = await response.text();
        setServerMessage(data);
      } catch (error) {
        console.error("Gagal terhubung ke server:", error);
        setServerMessage("Gagal terhubung ke server.");
      }
    };

    fetchData();
  }, []); // Array kosong berarti efek ini hanya berjalan sekali saat komponen dimuat

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Selamat Datang!</ThemedText>
      <View style={styles.messageContainer}>
        <Text>Pesan dari server:</Text>
        <ThemedText type="defaultSemiBold">{serverMessage}</ThemedText>
      </View>
    </ThemedView>
  );
}
