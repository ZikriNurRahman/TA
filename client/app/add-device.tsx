import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { addDeviceStyles as styles } from "@/styles/styles";
import { API_URL } from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";

export default function AddDeviceScreen() {
  const [name, setName] = useState("");
  const [type, setType] = useState("light");
  const router = useRouter();

  // ambil fungsi getToken
  const { getToken } = useAuth();

  const handleAddDevice = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Nama perangkat tidak boleh kosong.");
      return;
    }

    try {
      // ambil token
      const token = await getToken();

      const response = await fetch(`${API_URL}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menambahkan perangkat");
      }

      Alert.alert("Sukses", "Perangkat berhasil ditambahkan!");
      router.back(); // Kembali ke halaman utama setelah berhasil
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Gagal terhubung ke server");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Tambah Perangkat Baru</Text>
      <TextInput
        style={styles.input}
        placeholder="Nama Perangkat (misal: Lampu Dapur)"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Tipe Perangkat (misal: light atau fan)"
        value={type}
        onChangeText={setType}
      />
      <Button title="Tambahkan Perangkat" onPress={handleAddDevice} />
    </SafeAreaView>
  );
}
