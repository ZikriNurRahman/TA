import { FlatList, Alert, Text, View, SafeAreaView } from "react-native";
import { DeviceCard } from "@/components/DeviceCard";
import type { Device } from "@/types/Device";
import { globalStyles } from "@/styles/styles";
import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000";

export default function HomeScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/devices`);
      const data: Device[] = await response.json();
      setDevices(data);
    } catch (error) {
      console.error("Gagal mengambil data perangkat:", error);
      Alert.alert("Error", "Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: number) => {
    setDevices((currentDevices) =>
      currentDevices.map((device) =>
        device.id === id ? { ...device, isOn: !device.isOn } : device
      )
    );

    try {
      const response = await fetch(`${API_URL}/devices/${id}/toggle`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Gagal mengubah status perangkat di server.");
      }
    } catch (error) {
      console.error("Error saat toggle:", error);
      Alert.alert("Error", "Gagal menyinkronkan dengan server.");
      setDevices((currentDevices) =>
        currentDevices.map((device) =>
          device.id === id ? { ...device, isOn: !device.isOn } : device
        )
      );
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.loadingContainer}>
        <Text>Memuat perangkat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.homeContainer}>
      <Text style={globalStyles.homeTitle}>Perangkat Smarthome</Text>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <DeviceCard device={item} onToggle={() => handleToggle(item.id)} />
        )}
        contentContainerStyle={globalStyles.listContainer}
      />
    </SafeAreaView>
  );
}
