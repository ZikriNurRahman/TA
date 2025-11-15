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
import { useAuth } from "@clerk/clerk-expo";

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

  // ambil token
  const { getToken } = useAuth();

  // -- FUNGSI-FUNGSI LOGIKA --

  // Fetch semua perangkat untuk ditampilkan di dropdown
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Gagal ambil perangkat");

        const data = await response.json();
        if (Array.isArray(data)) {
          setDevices(data);
          if (data.length > 0) {
            setSelectedDevice(data[0]);
          }
        } else {
          console.error("Data perangkat bukan array:", data);
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
      if (delayTestInterval) clearInterval(delayTestInterval as NodeJS.Timeout);
    };
  }, []);

  // LISTENER SOCKET (Di-update saat sesi berubah)
  useEffect(() => {
    if (!socket) return;

    // Bersihkan listener lama agar tidak duplikat
    socket.off("log_updated");
    socket.off("throughput_log_updated");

    // Listener baru
    socket.on("log_updated", ({ sessionId }) => {
      if (sessionId === selectedSessionId) {
        fetchLogs(sessionId);
      }
    });

    socket.on("throughput_log_updated", ({ sessionId }) => {
      if (sessionId === selectedSessionId) fetchThroughputLogs(sessionId, 1);
    });

    // Cleanup
    return () => {
      socket.off("log_updated");
      socket.off("throughput_log_updated");
    };
  }, [selectedSessionId]);

  // Fetch riwayat sesi setiap kali perangkat diganti
  const fetchSessions = useCallback(
    async (deviceId: string) => {
      try {
        const token = await getToken();
        const response = await fetch(
          `${API_URL}/devices/${deviceId}/sessions`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) throw new Error("Gagal ambil sesi");

        const data: TestSession[] = await response.json();
        setSessions(data);

        // Jika tidak ada sesi aktif, tampilkan data dari sesi terbaru
        if (!isDelayTesting && data.length > 0) {
          setSelectedSessionId(data[0]._id);
        } else if (!isDelayTesting && data.length === 0) {
          setSelectedSessionId(null);
          setLogs([]); // Kosongkan log jika tidak ada riwayat
          setThroughputLogs([]);
        }
      } catch (error) {
        console.error("Gagal mengambil sesi:", error);
      }
    },
    [isDelayTesting, getToken]
  );

  useEffect(() => {
    if (selectedDevice) {
      fetchSessions(selectedDevice._id);
    }
  }, [selectedDevice, fetchSessions]);

  const fetchLogs = async (sessionId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/sessions/${sessionId}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Gagal ambil logs");

      setLogs(await response.json());
    } catch (error) {
      console.error("Gagal mengambil log delay:", error);
    }
  };

  const fetchThroughputLogs = async (sessionId: string, page: number) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/sessions/${sessionId}/throughput-logs?page=${page}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Gagal ambil log throughput");

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
      const token = await getToken();
      const response = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId: selectedDevice._id }),
      });

      if (!response.ok) throw new Error("Gagal buat sesi");

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
      const token = await getToken();
      await fetch(`${API_URL}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      const token = await getToken();
      await fetch(`${API_URL}/throughput-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, result }),
      });
    } catch (error) {
      console.error("Gagal menyimpan log throughput:", error);
    }
  };

  // --- SETUP GRAFIK ---
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = logs.length > 5 ? logs.length * 60 : screenWidth - 32;

  // chart data
  const chartData = {
    labels: logs.map((log) => new Date(log.timestamp).toLocaleTimeString()),
    datasets: [
      {
        data: logs.length > 0 ? logs.map((log) => log.delay) : [0],
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {/* judul */}
        <Text style={styles.title}>Uji Performa Jaringan</Text>

        {/* Picker Device */}
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

        {/* Tombol Mulai/Stop */}
        <Button
          title={
            isDelayTesting
              ? `Hentikan Tes #${sessions.length + 1}`
              : "Mulai Uji Coba Delay Baru"
          }
          onPress={isDelayTesting ? stopDelayTest : startDelayTest}
          color={isDelayTesting ? "red" : Colors.light.tint}
        />

        {/* Riwayat */}
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

        {/* Grafik */}
        <Text style={styles.subtitle}>Grafik Delay (ms)</Text>
        <ScrollView horizontal={true} style={{ marginBottom: 20 }}>
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
                propsForLabels: {
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
            <Text
              style={{
                textAlign: "center",
                padding: 20,
                width: screenWidth - 40,
              }}
            >
              Jalankan tes atau pilih riwayat untuk melihat grafik.
            </Text>
          )}
        </ScrollView>

        <View style={styles.separator} />

        {/* Throughput Test */}
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

        {/* Pagination Throughput */}
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

        {/* Tabel Delay (Dirender manual tanpa FlatList virtual) */}
        <Text style={styles.subtitle}>Tabel Log Delay</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Waktu</Text>
          <Text style={styles.tableHeaderText}>Delay (ms)</Text>
        </View>
        {logs.map((log) => (
          <View style={styles.tableRow} key={log._id}>
            <Text>{new Date(log.timestamp).toLocaleTimeString("id-ID")}</Text>
            <Text>{log.delay} ms</Text>
          </View>
        ))}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
