import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  Dimensions,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { io, Socket } from "socket.io-client";
import { Device } from "@/types/Device";
import { PerformanceLog } from "@/types/PerformanceLog";
import { performanceStyles as styles } from "@/styles/styles";
import { Colors } from "@/constants/Colors";
import { API_URL } from "@/constants/api";

let socket: Socket;

export default function PerformanceScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [isDelayTesting, setIsDelayTesting] = useState(false);
  const [testInterval, setTestInterval] = useState<
    NodeJS.Timeout | number | null
  >(null);
  const [isThroughputTesting, setIsThroughputTesting] = useState(false);
  const [throughputResult, setThroughputResult] = useState(0);

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
      if (testInterval) clearInterval(testInterval as NodeJS.Timeout);
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
      console.log(`Ping untuk ${selectedDevice.name}: ${delay} ms`);

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

  const startDelayTest = () => {
    if (testInterval) clearInterval(testInterval as NodeJS.Timeout);
    setIsDelayTesting(true);
    const interval = setInterval(runPingTest, 1000); // Lakukan tes setiap 1 detik
    setTestInterval(interval);
  };

  const stopDelayTest = () => {
    if (testInterval) clearInterval(testInterval as NodeJS.Timeout);
    setIsDelayTesting(false);
    setTestInterval(null);
  };

  const startThroughputTest = () => {
    if (!selectedDevice) {
      Alert.alert(
        "Pilih Perangkat",
        "Silakan pilih perangkat terlebih dahulu."
      );
      return;
    }
    setIsThroughputTesting(true);
    setThroughputResult(0);

    let commandsSent = 0;
    let commandsAcknowledged = 0;
    const testDuration = 5000; // Uji coba selama 5 detik
    const commandsPerSecond = 50; // Kirim 50 perintah per detik
    const totalCommands = (testDuration / 1000) * commandsPerSecond;

    const testInterval = setInterval(() => {
      if (commandsSent >= totalCommands) return;

      socket.emit(
        "toggle_device",
        selectedDevice._id,
        (response: { success: boolean }) => {
          if (response.success) {
            commandsAcknowledged++;
          }
        }
      );
      commandsSent++;
    }, 1000 / commandsPerSecond); // Interval pengiriman perintah

    // Hentikan tes setelah durasi selesai
    setTimeout(() => {
      clearInterval(testInterval);
      setIsThroughputTesting(false);
      const result = commandsAcknowledged / (testDuration / 1000);
      setThroughputResult(result);
      console.log(
        `Throughput Test Selesai: ${result.toFixed(2)} perintah/detik`
      );
    }, testDuration);
  };

  // Komponen Header untuk FlatList
  const ListHeader = () => {
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = logs.length > 5 ? logs.length * 60 : screenWidth - 32;

    const chartData = {
      labels: logs
        .map((log) => new Date(log.timestamp).toLocaleTimeString())
        .reverse(),
      datasets: [
        {
          data: logs.length > 0 ? logs.map((log) => log.delay).reverse() : [0],
        },
      ],
    };

    const maxDelay =
      logs.length > 0 ? Math.max(...logs.map((log) => log.delay)) : 0;
    let yAxisSegmentCount;
    if (maxDelay <= 6) {
      yAxisSegmentCount = Math.ceil(maxDelay) || 1;
    } else {
      yAxisSegmentCount = 5;
    }

    return (
      <>
        <Text style={styles.title}>Performance</Text>

        {/* pilih device */}
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

        {/* throughput test */}
        <Text style={styles.subtitle}>Throughput Test</Text>
        <Pressable
          style={[styles.button, isThroughputTesting && styles.buttonDisabled]}
          onPress={startThroughputTest}
          disabled={isThroughputTesting}
        >
          {isThroughputTesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start Throughput Test</Text>
          )}
        </Pressable>
        {throughputResult > 0 && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              Hasil: {throughputResult.toFixed(2)} Perintah / Detik
            </Text>
          </View>
        )}

        <View style={styles.separator} />

        {/* delay test */}
        <Text style={styles.subtitle}>Delay Test</Text>

        {/* tombol mulai */}
        <Button
          title={isDelayTesting ? "Stop Delay Test" : "Start Delay Test"}
          onPress={isDelayTesting ? stopDelayTest : startDelayTest}
          color={isDelayTesting ? "red" : Colors.light.tint}
        />

        {/* grafik delay test */}
        <Text style={styles.subtitle}>Delay Graphic (ms)</Text>
        <ScrollView horizontal={true}>
          {logs.length > 0 ? (
            <LineChart
              data={chartData}
              width={chartWidth}
              height={300}
              yAxisSuffix=" ms"
              fromZero={true}
              segments={yAxisSegmentCount}
              chartConfig={{
                backgroundColor: "#e26a00",
                backgroundGradientFrom: "#fb8c00",
                backgroundGradientTo: "#ffa726",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
                // formatYLabel={(yValue) => Math.round(Number(yValue)).toString()}
                propsForLabels: {
                  // Tambahkan rotasi agar tidak bertabrakan
                  rotation: -45,
                  fontSize: 10,
                  dx: -10,
                  dy: 10,
                },
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          ) : (
            <Text style={{ textAlign: "center", padding: 20 }}>
              Jalankan tes untuk melihat grafik.
            </Text>
          )}
        </ScrollView>

        <View style={styles.separator} />

        {/* tabel delay test */}
        <Text style={styles.subtitle}>Tabel Log</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Waktu</Text>
          <Text style={styles.tableHeaderText}>Delay (ms)</Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text>{new Date(item.timestamp).toLocaleTimeString()}</Text>
            <Text>{item.delay} ms</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
