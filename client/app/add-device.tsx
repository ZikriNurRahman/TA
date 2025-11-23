import { useState } from "react";
import { View, Text, TextInput, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { addDeviceStyles as styles } from "@/styles/styles";
import { API_URL } from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/Colors";
import { Card } from "@/components/ui/Card";
import { ModernButton } from "@/components/ui/ModernButton";

export default function AddDeviceScreen() {
  const [name, setName] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // ambil fungsi getToken
  const { getToken } = useAuth();

  const handleAddDevice = async () => {
    if (!name.trim() || !macAddress.trim()) {
      Alert.alert("Validasi", "Nama perangkat dan MAC Address wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          type: type.toLowerCase(), // Pastikan lowercase
          macAddress: macAddress.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menambahkan perangkat");
      }

      Alert.alert("Sukses", "Perangkat berhasil ditambahkan!");
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Tambah Perangkat</Text>

        <Card>
          <Text style={styles.sectionTitle}>Informasi Perangkat</Text>
          <Text style={{ color: Colors.light.textSecondary, marginBottom: 20 }}>
            Masukkan detail perangkat IoT yang ingin Anda hubungkan.
          </Text>

          {/* Input Nama */}
          <Text
            style={{
              fontWeight: "600",
              marginBottom: 6,
              color: Colors.light.text,
            }}
          >
            Nama Label
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Lampu Ruang Tamu"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          {/* Input MAC */}
          <Text
            style={{
              fontWeight: "600",
              marginBottom: 6,
              color: Colors.light.text,
            }}
          >
            MAC Address (ID Unik)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: 02:1A:2B:3C:4D:5E"
            placeholderTextColor="#9CA3AF"
            value={macAddress}
            onChangeText={setMacAddress}
            autoCapitalize="characters"
          />

          {/* Input Tipe */}
          <Text
            style={{
              fontWeight: "600",
              marginBottom: 6,
              color: Colors.light.text,
            }}
          >
            Tipe Perangkat
          </Text>
          <TextInput
            style={styles.input}
            placeholder="contoh: light atau fan"
            placeholderTextColor="#9CA3AF"
            value={type}
            onChangeText={setType}
            autoCapitalize="none"
          />

          <View style={{ marginTop: 10 }}>
            <ModernButton
              title="Simpan Perangkat"
              onPress={handleAddDevice}
              loading={loading}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
