import { View, Text, Alert, ActivityIndicator, Button } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Device } from "@/types/Device";
import { idStyles } from "@/styles/styles";
import { ConfirmModal } from "@/components/ConfirmModal";

const API_URL = "http://localhost:3000";

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Mengambil ID dari URL
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchDevice = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/devices/${id}`);
        if (!response.ok) {
          throw new Error("Perangkat tidak ditemukan");
        }
        const data = await response.json();
        setDevice(data);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Gagal memuat data perangkat.");
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [id]);

  // Fungsi untuk menangani penghapusan perangkat
  const handleDelete = async () => {
    setIsModalVisible(false); // Tutup modal dulu
    try {
      const response = await fetch(`${API_URL}/devices/${id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error("Gagal menghapus perangkat dari server.");

      router.back(); // Kembali ke halaman utama setelah berhasil
    } catch (error) {
      console.error(error);
      // Anda bisa menampilkan Alert di sini untuk notifikasi error
      alert("Gagal menghapus perangkat.");
    }
  };

  // Fungsi untuk menampilkan konfirmasi sebelum menghapus
  const confirmDelete = () => {
    setIsModalVisible(true);
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  if (!device) {
    return (
      <SafeAreaView style={idStyles.container}>
        <Text style={idStyles.errorText}>Perangkat tidak ditemukan.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={idStyles.container}>
      <Text style={idStyles.title}>{device.name}</Text>
      <Text style={idStyles.detail}>Tipe: {device.type}</Text>
      <Text style={idStyles.detail}>
        Status: {device.isOn ? "Menyala" : "Mati"}
      </Text>
      <Text style={idStyles.detail}>ID: {device._id}</Text>

      <View style={idStyles.buttonContainer}>
        <Button title="Hapus Perangkat" color="red" onPress={confirmDelete} />
      </View>

      <ConfirmModal
        visible={isModalVisible}
        title="Hapus Perangkat"
        message={`Apakah Anda yakin ingin menghapus "${device.name}"?`}
        onCancel={() => setIsModalVisible(false)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}
