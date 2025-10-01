import React, { useEffect, useState } from "react";
import {
  FlatList,
  Alert,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Link } from "expo-router";
import { DeviceCard } from "@/components/DeviceCard";
import type { Device } from "@/types/Device";
import { homeStyles } from "@/styles/styles";
import { io } from "socket.io-client";
import { API_URL } from "@/constants/api";

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

  const handleToggle = async (id: string) => {
    setDevices((currentDevices) =>
      currentDevices.map((device) =>
        device._id === id ? { ...device, isOn: !device.isOn } : device
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
          device._id === id ? { ...device, isOn: !device.isOn } : device
        )
      );
    }
  };

  useEffect(() => {
    // 2. Buat koneksi socket
    const socket = io(API_URL);

    socket.on("connect", () => {
      console.log("🔌 Terhubung ke server socket!");
      // Ambil data awal saat pertama kali terhubung
      fetchDevices();
    });

    // 3. Dengarkan event 'devices_updated' dari server
    socket.on("devices_updated", () => {
      console.log("🔄 Menerima pembaruan, mengambil data baru...");
      fetchDevices(); // Ambil ulang data setiap kali ada pembaruan
    });

    socket.on("disconnect", () => {
      console.log("🔌 Terputus dari server socket.");
    });

    // 4. Bersihkan koneksi saat komponen di-unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={homeStyles.loadingContainer}>
        <Text>Memuat perangkat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={homeStyles.container}>
      <View style={homeStyles.header}>
        <Text style={homeStyles.title}>Perangkat</Text>
        <Link href="/add-device" asChild>
          <TouchableOpacity style={homeStyles.addButton}>
            <Text style={homeStyles.addButtonText}>+</Text>
          </TouchableOpacity>
        </Link>
      </View>
      <FlatList
        data={devices}
        keyExtractor={(item) => item._id.toString()}
        renderItem={({ item }) => (
          <DeviceCard device={item} onToggle={() => handleToggle(item._id)} />
        )}
        contentContainerStyle={homeStyles.listContainer}
      />
    </SafeAreaView>
  );
}
