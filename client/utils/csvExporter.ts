import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native"; // Tambah Platform
import { API_URL } from "@/constants/api";
import { Device } from "@/types/Device";

// Helper: Simpan & Share File
const saveAndShareCSV = async (csvContent: string, fileName: string) => {
  if (Platform.OS === "web") {
    // --- LOGIKA KHUSUS WEB (Browser) ---
    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Gagal mendownload file dari browser Anda.");
    }
  } else {
    // --- LOGIKA KHUSUS MOBILE (Android/iOS) ---
    try {
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Error", "Fitur berbagi tidak tersedia.");
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Gagal menyimpan file di Smartphone Anda.");
    }
  }
};

// --- FUNGSI UTAMA: BATCH EXPORT ---
export const exportBatchToCSV = async (
  sessions: { sessionId: string; deviceId: string }[], // Daftar sesi dalam batch ini
  devices: Device[], // Daftar device untuk ambil namanya
  token: string,
  fileNameCustom: string
) => {
  try {
    if (sessions.length === 0) {
      Alert.alert("Info", "Tidak ada data sesi untuk diekspor.");
      return;
    }

    // Header CSV (Tambah kolom Device Name & Device ID)
    let csvContent = "Timestamp,Device Name,Device ID,Tipe Data,Nilai,Satuan\n";

    // Loop setiap sesi (paralel fetch agar cepat)
    const promises = sessions.map(async ({ sessionId, deviceId }) => {
      // Cari nama device
      const deviceName =
        devices.find((d) => d._id === deviceId)?.name || "Unknown Device";
      const cleanDevName = deviceName.replace(/,/g, " "); // Hapus koma di nama biar aman CSV

      // 1. Ambil Log Delay
      const delayRes = await fetch(`${API_URL}/sessions/${sessionId}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const delayLogs = await delayRes.json();

      // 2. Ambil Log Throughput
      const throughputRes = await fetch(
        `${API_URL}/sessions/${sessionId}/throughput-logs?all=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const throughputData = await throughputRes.json();
      const throughputLogs = throughputData.logs || throughputData;

      let rows = "";

      // Format Baris Delay
      if (Array.isArray(delayLogs)) {
        delayLogs.forEach((log: any) => {
          const time = new Date(log.timestamp)
            .toLocaleString("en-GB")
            .replace(/,/g, "");
          rows += `${time},${cleanDevName},${deviceId},Delay,${log.delay},ms\n`;
        });
      }

      // Format Baris Throughput
      if (Array.isArray(throughputLogs)) {
        throughputLogs.forEach((log: any) => {
          const time = new Date(log.timestamp)
            .toLocaleString("en-GB")
            .replace(/,/g, "");
          rows += `${time},${cleanDevName},${deviceId},Throughput,${log.result},req/s\n`;
        });
      }

      return rows;
    });

    // Tunggu semua data terkumpul
    const results = await Promise.all(promises);
    csvContent += results.join(""); // Gabungkan semua baris

    // Simpan File
    // Bersihkan nama file dari karakter aneh
    const safeFileName =
      fileNameCustom.replace(/[^a-zA-Z0-9-_]/g, "_") + ".csv";
    await saveAndShareCSV(csvContent, safeFileName);
  } catch (error: any) {
    console.error("Batch Export Error:", error);
    Alert.alert("Gagal Ekspor", error.message);
  }
};
