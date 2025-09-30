import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { globalStyles } from "@/styles/styles";

const API_URL = "http://localhost:3000"; // Sesuaikan dengan IP Anda jika perlu

export default function AddDeviceScreen() {
  const [name, setName] = useState("");
  const [type, setType] = useState("light");
  const router = useRouter();

  const handleAddDevice = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Nama perangkat tidak boleh kosong.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, type }),
      });

      if (!response.ok) {
        throw new Error("Gagal menambahkan perangkat");
      }

      Alert.alert("Sukses", "Perangkat berhasil ditambahkan!");
      router.back(); // Kembali ke halaman utama setelah berhasil
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal terhubung ke server.");
    }
  };

  return (
    <SafeAreaView style={globalStyles.addDeviceContainer}>
      <Text style={globalStyles.addDeviceTitle}>Tambah Perangkat Baru</Text>
      <TextInput
        style={globalStyles.addDeviceInput}
        placeholder="Nama Perangkat (misal: Lampu Dapur)"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={globalStyles.addDeviceInput}
        placeholder="Tipe Perangkat (misal: light atau fan)"
        value={type}
        onChangeText={setType}
      />
      <Button title="Tambahkan Perangkat" onPress={handleAddDevice} />
    </SafeAreaView>
  );
}
