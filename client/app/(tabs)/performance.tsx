import React, { useState, useEffect, useCallback } from "react";
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
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { io, Socket } from "socket.io-client";

import { Device } from "@/types/Device";
import { PerformanceLog } from "@/types/PerformanceLog";
import { TestSession } from "@/types/TestSession";
import { ThroughputLog } from "@/types/ThroughputLog";

import { performanceStyles as styles } from "@/styles/styles";
import { Colors } from "@/constants/Colors";
import { API_URL } from "@/constants/api";

let socket: Socket;

export default function PerformanceScreen() {
  // State untuk data utama
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // State untuk riwayat dan sesi
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // State untuk Log Delay & Status
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [isDelayTesting, setIsDelayTesting] = useState(false);
  const [delayTestInterval, setDelayTestInterval] = useState<
    NodeJS.Timeout | number | null
  >(null);

  // State untuk Log Throughput & Status
  const [isThroughputTesting, setIsThroughputTesting] = useState(false);
  const [throughputLogs, setThroughputLogs] = useState<ThroughputLog[]>([]);
  const [throughputPage, setThroughputPage] = useState(1);
  const [totalThroughputPages, setTotalThroughputPages] = useState(1);

  // -- FUNGSI-FUNGSI LOGIKA --

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

    // Listener untuk update log secara real-time
    socket.on("log_updated", ({ sessionId }) => {
      if (sessionId === selectedSessionId) {
        fetchLogs(sessionId);
      }
    });

    socket.on("throughput_log_updated", ({ sessionId }) => {
      if (sessionId === selectedSessionId) fetchThroughputLogs(sessionId, 1);
    });

    return () => {
      socket.disconnect();
      if (delayTestInterval) clearInterval(delayTestInterval as NodeJS.Timeout);
    };
  }, []);

  // Fetch riwayat sesi setiap kali perangkat diganti
  const fetchSessions = useCallback(
    async (deviceId: string) => {
      try {
        const response = await fetch(`${API_URL}/devices/${deviceId}/sessions`);
        const data: TestSession[] = await response.json();
        setSessions(data);
        // Jika tidak ada sesi aktif, tampilkan data dari sesi terbaru
        if (!isDelayTesting && data.length > 0) {
          setSelectedSessionId(data[0]._id);
        } else if (!isDelayTesting) {
          setLogs([]); // Kosongkan log jika tidak ada riwayat
          setThroughputLogs([]);
        }
      } catch (error) {
        console.error("Gagal mengambil sesi:", error);
      }
    },
    [isDelayTesting]
  );

  useEffect(() => {
    if (selectedDevice) {
      fetchSessions(selectedDevice._id);
    }
  }, [selectedDevice, fetchSessions]);

  const fetchLogs = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/logs`);
      setLogs(await response.json());
    } catch (error) {
      console.error("Gagal mengambil log delay:", error);
    }
  };

  const fetchThroughputLogs = async (sessionId: string, page: number) => {
    try {
      const response = await fetch(
        `${API_URL}/sessions/${sessionId}/throughput-logs?page=${page}`
      );
      const data = await response.json();
      setThroughputLogs(data.logs);
      setThroughputPage(data.currentPage);
      setTotalThroughputPages(data.totalPages);
    } catch (error) {
      console.error("Gagal mengambil log throughput:", error);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchLogs(selectedSessionId);
      fetchThroughputLogs(selectedSessionId, 1);
    }
  }, [selectedSessionId]);

  const startDelayTest = async () => {
    if (!selectedDevice) return;
    if (delayTestInterval) clearInterval(delayTestInterval as NodeJS.Timeout);
    setLogs([]);
    setThroughputLogs([]);
    try {
      const response = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDevice._id }),
      });
      const newSession: TestSession = await response.json();
      setActiveSessionId(newSession._id);
      setSelectedSessionId(newSession._id);
      setIsDelayTesting(true);
      const interval = setInterval(() => runPingTest(newSession._id), 1000);
      setDelayTestInterval(interval);
    } catch (error) {
      console.error("Gagal membuat sesi:", error);
    }
  };

  const stopDelayTest = () => {
    if (delayTestInterval) clearInterval(delayTestInterval as NodeJS.Timeout);
    setIsDelayTesting(false);
    setDelayTestInterval(null);
    setActiveSessionId(null);
    if (selectedDevice) fetchSessions(selectedDevice._id);
  };

  const runPingTest = (currentSessionId: string) => {
    const startTime = Date.now();
    socket.emit("ping", () => {
      const delay = Date.now() - startTime;
      saveLog(currentSessionId, delay);
    });
  };

  const saveLog = async (sessionId: string, delay: number) => {
    try {
      await fetch(`${API_URL}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, delay }),
      });
    } catch (error) {
      console.error("Gagal menyimpan log:", error);
    }
  };

  const startThroughputTest = () => {
    if (!activeSessionId) {
      Alert.alert(
        "Mulai Tes Delay Dahulu",
        "Sesi tes harus aktif untuk menguji throughput."
      );
      return;
    }
    setIsThroughputTesting(true);
    let commandsAcknowledged = 0;
    const testDuration = 5000;
    const commandsPerSecond = 50;
    const totalCommands = (testDuration / 1000) * commandsPerSecond;
    const testInterval = setInterval(() => {
      if (commandsAcknowledged >= totalCommands) return;
      socket.emit(
        "toggle_device",
        selectedDevice?._id,
        (response: { success: boolean }) => {
          if (response.success) commandsAcknowledged++;
        }
      );
    }, 1000 / commandsPerSecond);
    setTimeout(() => {
      clearInterval(testInterval);
      setIsThroughputTesting(false);
      const result = commandsAcknowledged / (testDuration / 1000);
      saveThroughputLog(activeSessionId, result);
    }, testDuration);
  };

  const saveThroughputLog = async (sessionId: string, result: number) => {
    try {
      await fetch(`${API_URL}/throughput-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, result }),
      });
    } catch (error) {
      console.error("Gagal menyimpan log throughput:", error);
    }
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
        <Text style={styles.title}>{API_URL}</Text>

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

        {/* tombol mulai */}
        <Button
          title={
            isDelayTesting
              ? `Hentikan Tes #${sessions.length + 1}`
              : "Mulai Uji Coba Delay Baru"
          }
          onPress={isDelayTesting ? stopDelayTest : startDelayTest}
          color={isDelayTesting ? "red" : Colors.light.tint}
        />

        <Text style={styles.subtitle}>Riwayat Percobaan</Text>

        <View style={{ marginBottom: 20 }}>
          {sessions.map((session, index) => (
            <TouchableOpacity
              key={session._id}
              style={[
                styles.historyItem,
                selectedSessionId === session._id && styles.historyItemSelected,
              ]}
              onPress={() =>
                !isDelayTesting && setSelectedSessionId(session._id)
              }
            >
              <Text
                style={selectedSessionId === session._id && { color: "white" }}
              >
                Percobaan #{sessions.length - index} (
                {new Date(session.startTime).toLocaleString("id-ID")})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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

        <Text style={styles.subtitle}>Uji Throughput</Text>
        <Text style={{ marginBottom: 10, fontStyle: "italic", color: "#666" }}>
          (Hanya bisa dijalankan saat sesi tes delay sedang aktif)
        </Text>
        <Pressable
          style={[
            styles.button,
            (!isDelayTesting || isThroughputTesting) && styles.buttonDisabled,
          ]}
          onPress={startThroughputTest}
          disabled={!isDelayTesting || isThroughputTesting}
        >
          {isThroughputTesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Mulai Uji Coba Throughput</Text>
          )}
        </Pressable>
        <Text style={styles.subtitle}>Tabel Log Throughput</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Waktu</Text>
          <Text style={styles.tableHeaderText}>Hasil (Perintah/detik)</Text>
        </View>
        {throughputLogs.map((log) => (
          <View style={styles.tableRow} key={log._id}>
            <Text>{new Date(log.timestamp).toLocaleString("id-ID")}</Text>
            <Text>{log.result.toFixed(2)}</Text>
          </View>
        ))}
        {totalThroughputPages > 1 && (
          <View style={styles.paginationContainer}>
            <Button
              title="< Sebelumnya"
              onPress={() =>
                fetchThroughputLogs(selectedSessionId!, throughputPage - 1)
              }
              disabled={throughputPage <= 1}
            />
            <Text style={styles.paginationText}>
              {throughputPage} / {totalThroughputPages || 1}
            </Text>
            <Button
              title="Berikutnya >"
              onPress={() =>
                fetchThroughputLogs(selectedSessionId!, throughputPage + 1)
              }
              disabled={throughputPage >= totalThroughputPages}
            />
          </View>
        )}

        {/* tabel delay test */}
        <Text style={styles.subtitle}>Tabel Log Delay</Text>
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
            <Text>{new Date(item.timestamp).toLocaleTimeString("id-ID")}</Text>
            <Text>{item.delay} ms</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
