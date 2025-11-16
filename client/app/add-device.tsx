import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { addDeviceStyles as styles } from "@/styles/styles";
import { API_URL } from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";

export default function AddDeviceScreen() {
  const [name, setName] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [type, setType] = useState("");
  const router = useRouter();

  // ambil fungsi getToken
  const { getToken } = useAuth();

  const handleAddDevice = async () => {
    if (!name.trim() || !macAddress.trim()) {
      Alert.alert(
        "Error",
        "Nama perangkat dan MAC Address tidak boleh kosong."
      );
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
        body: JSON.stringify({ name, type, macAddress: macAddress.trim() }),
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

      <Text style={{ marginBottom: 5 }}>Nama Perangkat</Text>
      <TextInput
        style={styles.input}
        placeholder="contoh: Lampu Dapur"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />

      <Text style={{ marginBottom: 5 }}>MAC Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Contoh: AA:BB:CC:11:22:33"
        placeholderTextColor="#888"
        value={macAddress}
        onChangeText={setMacAddress}
        autoCapitalize="characters" // Otomatis huruf besar
      />

      <Text style={{ marginBottom: 5 }}>Tipe Perangkat</Text>
      <TextInput
        style={styles.input}
        placeholder="contoh: light atau fan"
        placeholderTextColor="#888"
        value={type}
        onChangeText={setType}
      />
      <Button title="Tambahkan Perangkat" onPress={handleAddDevice} />
    </SafeAreaView>
  );
}
