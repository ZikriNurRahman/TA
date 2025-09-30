import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Device } from "@/types/Device";
import { idStyles } from "@/styles/styles";

const API_URL = "http://localhost:3000"; // Sesuaikan jika perlu

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Mengambil ID dari URL
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

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
    </SafeAreaView>
  );
}
