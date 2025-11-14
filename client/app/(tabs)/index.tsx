import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  Alert,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { DeviceCard } from "@/components/DeviceCard";
import type { Device } from "@/types/Device";
import { homeStyles } from "@/styles/styles";
import { io } from "socket.io-client";
import { API_URL } from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";

export default function HomeScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // ambil fungsi getToken
  const { getToken } = useAuth();

  // ambil data semua perangkat dalam satu akun
  const fetchDevices = async () => {
    try {
      setLoading(true);

      // ambil token sebelum request
      const token = await getToken();

      const response = await fetch(`${API_URL}/devices`, {
        // header authorization
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Gagal mengambil data");

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
      // ambil token
      const token = await getToken();

      const response = await fetch(`${API_URL}/devices/${id}/toggle`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // header authorization
        },
      });

      if (!response.ok) {
        throw new Error("Gagal mengubah status perangkat di server.");
      }
    } catch (error) {
      console.error("Error saat toggle:", error);
      Alert.alert("Error", "Gagal menyinkronkan dengan server.");
      fetchDevices(); // Revert jika gagal
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDevices();
    }, [])
  );

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
      {/* judul dan add device */}
      <View style={homeStyles.header}>
        <Text style={homeStyles.title}>Perangkat</Text>
        <Link href="/add-device" asChild>
          <TouchableOpacity style={homeStyles.addButton}>
            <Text style={homeStyles.addButtonText}>+</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* list perangkat */}
      {devices.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#666" }}>Belum ada perangkat.</Text>
          <Text style={{ color: "#666" }}>Tekan + untuk menambahkan.</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item._id.toString()}
          renderItem={({ item }) => (
            <DeviceCard device={item} onToggle={() => handleToggle(item._id)} />
          )}
          contentContainerStyle={homeStyles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}
