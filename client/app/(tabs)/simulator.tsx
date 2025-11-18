import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addDeviceStyles as styles } from "@/styles/styles"; // Kita pakai style yang sudah ada biar hemat
import { API_URL } from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors } from "@/constants/Colors";

export default function SimulatorScreen() {
  const [count, setCount] = useState(""); // Default 5 perangkat
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { getToken } = useAuth();

  // Fungsi Helper: Membuat MAC Address Random yang Valid (Format: XX:XX:XX:XX:XX:XX)
  const generateRandomMac = () => {
    const hex = () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0");
    // Menggunakan prefix '02' untuk menandakan Locally Administered Address (standar untuk virtual)
    return `02:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
  };

  // Fungsi untuk Membuat Perangkat Virtual Massal
  const generateDevices = async () => {
    const num = parseInt(count);
    if (isNaN(num) || num <= 0) {
      Alert.alert("Error", "Masukkan jumlah yang valid (misal: 10)");
      return;
    }

    setIsGenerating(true);
    setLogs((prev) => [`🚀 Memulai generate ${num} perangkat...`, ...prev]);

    try {
      const token = await getToken();
      // Buat Penanda Waktu (Batch Timestamp)
      // Kita ambil waktu SEKALI saja di sini agar semua device dalam batch ini punya waktu yg sama
      const now = new Date();
      // Format: Jam.Menit.Detik (contoh: 14.30.05)
      const timeStamp = now.toLocaleTimeString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      for (let i = 1; i <= num; i++) {
        // Nama: Device 1, Device 2, dst.
        const name = `Device ${i} (${timeStamp})`;

        // MAC: Format standar (02:1F:3A:...)
        const mac = generateRandomMac();

        try {
          const res = await fetch(`${API_URL}/devices`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name,
              type: "simulator",
              macAddress: mac,
            }),
          });

          if (res.ok) {
            setLogs((prev) => [`✅ Sukses: ${name}`, ...prev]);
          } else {
            const err = await res.json();
            setLogs((prev) => [`❌ Gagal (${i}): ${err.message}`, ...prev]);
          }
        } catch (error) {
          setLogs((prev) => [`⚠️ Error Jaringan pada #${i}`, ...prev]);
        }

        // Jeda sedikit agar server tidak shock (throttle)
        await new Promise((r) => setTimeout(r, 50));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
      setLogs((prev) => [`🏁 Selesai!`, ...prev]);
      Alert.alert("Selesai", `Proses simulasi selesai.`);
    }
  };

  // FUNGSI PEMICU MODAL
  const onDeletePress = () => {
    setIsModalVisible(true);
  };

  const resetHistoryDatabase = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/admin/reset-history`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error(error);
    }
  };

  // FUNGSI EKSEKUSI HAPUS (Dipanggil saat tombol "Hapus" di modal ditekan)
  const handleConfirmDelete = async () => {
    setIsModalVisible(false); // Tutup modal
    setIsDeleting(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/devices/simulators`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setLogs((prev) => [`🗑️ ${data.message}`, ...prev]);
        // Gunakan alert standar browser/native untuk sukses
        alert(data.message);
      } else {
        throw new Error(data.message || "Gagal menghapus simulator");
      }
    } catch (error: any) {
      console.error(error);
      setLogs((prev) => [`❌ Error Hapus: ${error.message}`, ...prev]);
      alert(`Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Device Simulator</Text>
      <Text style={{ marginBottom: 20, textAlign: "center", color: "#666" }}>
        Alat ini akan membuat perangkat virtual di akun Anda untuk pengujian
        beban (Load Test).
      </Text>

      <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
        Jumlah Perangkat:
      </Text>
      <TextInput
        style={styles.input}
        value={count}
        onChangeText={setCount}
        keyboardType="numeric"
        placeholder="Masukkan jumlah (misal: 50)"
        placeholderTextColor="#888"
        editable={!isGenerating}
      />

      <View style={{ gap: 10 }}>
        {/* generate device button */}
        <Button
          title={
            isGenerating ? "Sedang Membuat..." : `Generate ${count} Perangkat`
          }
          onPress={generateDevices}
          disabled={isGenerating}
        />

        {/* delete button */}
        <Button
          title={isDeleting ? "Sedang Menghapus..." : "Hapus Semua Simulator"}
          onPress={onDeletePress}
          color="red" // Warna merah untuk tanda bahaya/hapus
          disabled={isGenerating || isDeleting}
        />

        {/* BUTTON KHUSUS: hapus semua riwayat tes */}
        {/* AKTIFKAN KALAU BUTUH AJA */}
        {/* <Button
          title="RESET TOTAL DATABASE RIWAYAT"
          onPress={resetHistoryDatabase}
          color="orange"
        /> */}

        {/* Log */}
        <View
          style={{
            marginTop: 10,
            height: 300,
            backgroundColor: "#f0f0f0",
            borderRadius: 8,
            padding: 10,
          }}
        >
          <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
            Log Aktivitas:
          </Text>
          <ScrollView>
            {logs.length === 0 && (
              <Text style={{ color: "#999", fontStyle: "italic" }}>
                Belum ada aktivitas.
              </Text>
            )}
            {logs.map((log, index) => (
              <Text
                key={index}
                style={{
                  fontSize: 12,
                  marginBottom: 4,
                  fontFamily: "SpaceMono",
                }}
              >
                {log}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* delete confirm modal */}
      <ConfirmModal
        visible={isModalVisible}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus SEMUA perangkat virtual simulator?"
        onCancel={() => setIsModalVisible(false)}
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
  );
}
