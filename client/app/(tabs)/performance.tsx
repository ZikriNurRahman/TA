import { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { io, Socket } from "socket.io-client";
import { Device } from "@/types/Device";
import { PerformanceLog } from "@/types/PerformanceLog";
import { performanceStyles as styles } from "@/styles/styles";
import { Colors } from "@/constants/Colors";

const API_URL = "http://10.28.185.144:3000";

let socket: Socket;

export default function PerformanceScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testInterval, setTestInterval] = useState<
    NodeJS.Timeout | number | null
  >(null);

  // Fetch semua perangkat untuk ditampilkan di dropdown
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(`${API_URL}/devices`);
        const data = await response.json();
        setDevices(data);
        if (data.length > 0) {
          setSelectedDevice(data[0]); // Pilih perangkat pertama sebagai default
        }
      } catch (error) {
        console.error("Gagal mengambil perangkat:", error);
      }
    };
    fetchDevices();

    // Inisialisasi koneksi socket
    socket = io(API_URL);
    return () => {
      socket.disconnect();
      if (testInterval) clearInterval(testInterval);
    };
  }, []);

  // Fetch logs setiap kali perangkat yang dipilih berubah
  useEffect(() => {
    if (selectedDevice) {
      fetchLogs(selectedDevice._id);
    }
  }, [selectedDevice]);

  const fetchLogs = async (deviceId: string) => {
    try {
      const response = await fetch(`${API_URL}/devices/${deviceId}/logs`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Gagal mengambil logs:", error);
    }
  };

  const runPingTest = () => {
    if (!selectedDevice) return;

    const startTime = Date.now();
    socket.emit("ping", () => {
      const delay = Date.now() - startTime;
      console.log(`Ping untuk ${selectedDevice.name}: ${delay}ms`);

      // Simpan log ke database
      saveLog(selectedDevice._id, delay);
    });
  };

  const saveLog = async (deviceId: string, delay: number) => {
    try {
      await fetch(`${API_URL}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, delay }),
      });
      // Ambil ulang data log untuk memperbarui tabel & grafik
      fetchLogs(deviceId);
    } catch (error) {
      console.error("Gagal menyimpan log:", error);
    }
  };

  const startTesting = () => {
    if (testInterval) clearInterval(testInterval as NodeJS.Timeout);
    setIsTesting(true);
    const interval = setInterval(runPingTest, 1000); // Lakukan tes setiap 1 detik
    setTestInterval(interval);
  };

  const stopTesting = () => {
    if (testInterval) clearInterval(testInterval as NodeJS.Timeout);
    setIsTesting(false);
    setTestInterval(null);
  };

  const chartData = {
    labels: logs
      .map((log) => new Date(log.timestamp).toLocaleTimeString())
      .reverse(),
    datasets: [
      {
        data: logs.map((log) => log.delay).reverse(),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Uji Performa Jaringan</Text>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDevice?._id}
            onValueChange={(itemValue) => {
              const device = devices.find((d) => d._id === itemValue);
              setSelectedDevice(device || null);
            }}
          >
            {devices.map((device) => (
              <Picker.Item
                key={device._id}
                label={device.name}
                value={device._id}
              />
            ))}
          </Picker>
        </View>

        <Button
          title={isTesting ? "Hentikan Uji Coba" : "Mulai Uji Coba Delay"}
          onPress={isTesting ? stopTesting : startTesting}
          color={isTesting ? "red" : Colors.light.tint}
        />

        <Text style={styles.subtitle}>Grafik Delay (ms)</Text>
        <LineChart
          data={chartData}
          width={Dimensions.get("window").width - 32}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" ms"
          chartConfig={{
            backgroundColor: "#e26a00",
            backgroundGradientFrom: "#fb8c00",
            backgroundGradientTo: "#ffa726",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />

        <Text style={styles.subtitle}>Tabel Log</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Waktu</Text>
          <Text style={styles.tableHeaderText}>Delay (ms)</Text>
        </View>
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.tableRow}>
              <Text>{new Date(item.timestamp).toLocaleTimeString()}</Text>
              <Text>{item.delay} ms</Text>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
