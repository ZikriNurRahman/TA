import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Button,
  Dimensions,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
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

export default function PerformanceScreen() {
  // Gunakan useRef agar koneksi stabil dan tidak menyebabkan render ulang
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);

  // State untuk data utama
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // State untuk riwayat dan sesi
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [activeSessionMap, setActiveSessionMap] = useState<
    Record<string, string>
  >({});

  // State untuk Log Delay & Status
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [isDelayTesting, setIsDelayTesting] = useState(false);

  // State untuk Log Throughput & Status
  const [isThroughputTesting, setIsThroughputTesting] = useState(false);
  const [throughputLogs, setThroughputLogs] = useState<ThroughputLog[]>([]);
  const [throughputPage, setThroughputPage] = useState(1);
  const [totalThroughputPages, setTotalThroughputPages] = useState(1);

  // --- MODE SERENTAK ---
  const [isMultiDeviceMode, setIsMultiDeviceMode] = useState(false);

  // ambil token
  const { getToken } = useAuth();

  // -- FUNGSI-FUNGSI LOGIKA --

  // -- SETUP AWAL
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
    socketRef.current = io(API_URL);

    // UPDATE OTOMATIS SAAT DEVICE BERTAMBAH
    socketRef.current.on("devices_updated", () => {
      console.log("🔄 Refreshing devices list...");
      fetchDevices();
    });

    return () => {
      socketRef.current?.off("devices_updated");
      socketRef.current?.disconnect();
      if (intervalRef.current)
        clearInterval(intervalRef.current as NodeJS.Timeout);
    };
  }, []);

  // LISTENER SOCKET (Di-update saat sesi berubah)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Bersihkan listener lama agar tidak duplikat
    socket.off("log_updated");
    socket.off("throughput_log_updated");

    const handleLogUpdate = ({ sessionId }: { sessionId: string }) => {
      if (sessionId === selectedSessionId) fetchLogs(sessionId);
    };
    const handleThroughputUpdate = ({ sessionId }: { sessionId: string }) => {
      if (sessionId === selectedSessionId) fetchThroughputLogs(sessionId, 1);
    };

    socket.on("log_updated", handleLogUpdate);
    socket.on("throughput_log_updated", handleThroughputUpdate);

    // Cleanup
    return () => {
      socket.off("log_updated", handleLogUpdate);
      socket.off("throughput_log_updated", handleThroughputUpdate);
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

        // Logic reset pilihan sesi
        // Jika sedang testing, jangan ubah selectedSessionId kecuali user memaksa
        // Jika tidak testing, otomatis pilih sesi terbaru
        if (!isDelayTesting && data.length > 0) {
          // Cek apakah device ini punya sesi yang sedang aktif berjalan?
          const runningSessionId = activeSessionMap[deviceId];
          if (runningSessionId) {
            setSelectedSessionId(runningSessionId);
          } else if (
            !selectedSessionId ||
            sessions.findIndex((s) => s._id === selectedSessionId) === -1
          ) {
            setSelectedSessionId(data[0]._id);
          }
        } else if (!isDelayTesting && data.length === 0) {
          setSelectedSessionId(null);
          setLogs([]);
          setThroughputLogs([]);
        }
      } catch (error) {
        console.error("Gagal mengambil sesi:", error);
      }
    },
    [isDelayTesting, getToken, selectedSessionId, activeSessionMap]
  );

  useEffect(() => {
    if (selectedDevice) {
      // Saat ganti device, reset log view dulu
      setLogs([]);
      setThroughputLogs([]);
      fetchSessions(selectedDevice._id);
    }
  }, [selectedDevice]);

  const fetchLogs = async (sessionId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/sessions/${sessionId}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Gagal ambil logs");
      setLogs(await response.json());
    } catch (error) {
      console.error("Gagal ambil log delay:", error);
    }
  };

  const fetchThroughputLogs = async (sessionId: string, page: number) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/sessions/${sessionId}/throughput-logs?page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Gagal ambil log throughput");
      const data = await response.json();
      setThroughputLogs(data.logs);
      setThroughputPage(data.currentPage);
      setTotalThroughputPages(data.totalPages);
    } catch (error) {
      console.error("Gagal ambil log throughput:", error);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchLogs(selectedSessionId);
      fetchThroughputLogs(selectedSessionId, 1);
    }
  }, [selectedSessionId]);

  // --- FUNGSI TES DELAY ---
  const startDelayTest = async () => {
    if (!selectedDevice) return;
    if (intervalRef.current)
      clearInterval(intervalRef.current as NodeJS.Timeout);

    // Tentukan target: 1 device atau SEMUA device
    const targets = isMultiDeviceMode ? devices : [selectedDevice];

    if (targets.length === 0) return;

    setLogs([]); // Kosongkan tampilan lokal

    try {
      const token = await getToken();
      const newSessionMap: Record<string, string> = {};

      // 1. Buat Sesi untuk SETIAP target secara paralel
      // Ini agar Device 2, Device 3, dst punya sesi masing-masing
      const sessionPromises = targets.map(async (device) => {
        const response = await fetch(`${API_URL}/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ deviceId: device._id }),
        });
        if (response.ok) {
          const session = await response.json();
          newSessionMap[device._id] = session._id;
        }
      });

      await Promise.all(sessionPromises);

      // Update state
      setActiveSessionMap(newSessionMap);
      setIsDelayTesting(true);

      // Jika device yang sedang dilihat (selectedDevice) punya sesi baru, tampilkan itu
      if (selectedDevice && newSessionMap[selectedDevice._id]) {
        setSelectedSessionId(newSessionMap[selectedDevice._id]);
        // Refresh list sesi agar sesi baru muncul di riwayat
        fetchSessions(selectedDevice._id);
      }

      // Mulai Interval Ping
      const interval = setInterval(() => runPingBatch(newSessionMap), 1000);
      intervalRef.current = interval;
    } catch (error) {
      console.error("Gagal membuat sesi:", error);
      Alert.alert("Error", "Gagal memulai sesi tes.");
    }
  };

  const stopDelayTest = () => {
    if (intervalRef.current)
      clearInterval(intervalRef.current as NodeJS.Timeout);
    intervalRef.current = null;
    setIsDelayTesting(false);
    setActiveSessionMap({}); // Reset map sesi aktif

    // Refresh tampilan akhir
    if (selectedDevice) fetchSessions(selectedDevice._id);
  };

  // Mengirim Ping ke SEMUA sesi aktif
  const runPingBatch = async (sessionMap: Record<string, string>) => {
    const socket = socketRef.current;
    if (!socket) return;

    const sessionIds = Object.values(sessionMap);

    // Kirim ping untuk setiap sesi
    // Kita pakai Promise.all untuk mengirim serentak
    sessionIds.forEach((sessionId) => {
      const startTime = Date.now();
      socket.emit("ping", () => {
        const delay = Date.now() - startTime;
        saveLog(sessionId, delay);
      });
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
      console.error("Gagal simpan log:", error);
    }
  };

  // --- FUNGSI TES THROUGHPUT ---
  const startThroughputTest = () => {
    // Cek apakah ada sesi aktif (minimal satu)
    const sessionIds = Object.values(activeSessionMap);
    if (sessionIds.length === 0) {
      Alert.alert("Info", "Mulai Tes Delay dulu agar sesi terbentuk.");
      return;
    }

    setIsThroughputTesting(true);
    let commandsAcknowledged = 0;
    const testDuration = 5000; // 5 detik
    const commandsPerSecond = 50; // Target total beban ke server

    // Jika multi-device, kita bagi beban atau kali beban?
    // Untuk stress test: Total beban server = commandsPerSecond.
    // Kita akan acak device mana yang menerima perintah.

    const totalCommands = (testDuration / 1000) * commandsPerSecond;

    const interval = setInterval(() => {
      if (commandsAcknowledged >= totalCommands) return;

      // Pilih device target secara acak dari yang sedang aktif
      const deviceIds = Object.keys(activeSessionMap);
      const randomDeviceId =
        deviceIds[Math.floor(Math.random() * deviceIds.length)];

      socketRef.current?.emit("toggle_device", randomDeviceId, (res: any) => {
        if (res?.success) commandsAcknowledged++;
      });
    }, 1000 / commandsPerSecond);

    setTimeout(() => {
      clearInterval(interval);
      setIsThroughputTesting(false);
      const result = commandsAcknowledged / (testDuration / 1000); // Total throughput sistem

      // Simpan hasil yang sama ke SEMUA sesi aktif agar grafik muncul di semua device
      sessionIds.forEach((sid) => {
        saveThroughputLog(sid, result);
      });
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
      console.error("Gagal simpan throughput:", error);
    }
  };

  // --- UI ---
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = logs.length > 5 ? logs.length * 60 : screenWidth - 32;

  const delayChartData = {
    labels: logs
      .map((log) => new Date(log.timestamp).toLocaleTimeString())
      .reverse(),
    datasets: [
      { data: logs.length > 0 ? logs.map((log) => log.delay).reverse() : [0] },
    ],
  };

  const throughputChartData = {
    labels: throughputLogs
      .map((log) => new Date(log.timestamp).toLocaleTimeString())
      .reverse(),
    datasets: [
      {
        data:
          throughputLogs.length > 0
            ? throughputLogs.map((log) => log.result).reverse()
            : [0],
      },
    ],
  };

  const throughputChartWidth =
    throughputLogs.length > 5 ? throughputLogs.length * 60 : screenWidth - 32;

  const maxDelay =
    logs.length > 0 ? Math.max(...logs.map((log) => log.delay)) : 0;
  const yAxisSegmentCount = maxDelay <= 6 ? Math.ceil(maxDelay) || 1 : 5;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Uji Performa Jaringan</Text>

        {/* SWITCH MODE SERENTAK */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 15,
            marginHorizontal: 16,
            padding: 10,
            backgroundColor: "#fff",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "bold", fontSize: 16 }}>
              Uji Semua Perangkat
            </Text>
            <Text style={{ fontSize: 12, color: "#666" }}>
              {isMultiDeviceMode
                ? `Menguji ${devices.length} perangkat sekaligus`
                : "Hanya menguji 1 perangkat yang dipilih"}
            </Text>
          </View>
          <Switch
            value={isMultiDeviceMode}
            onValueChange={setIsMultiDeviceMode}
            trackColor={{ false: "#767577", true: Colors.light.tint }}
          />
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDevice?._id}
            onValueChange={(itemValue) => {
              const device = devices.find((d) => d._id === itemValue);
              setSelectedDevice(device || null);
            }}
            enabled={!isMultiDeviceMode} // Disable picker jika mode serentak
            style={isMultiDeviceMode ? { opacity: 0.5 } : {}}
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
          title={isDelayTesting ? "Hentikan Tes" : "Mulai Uji Coba Delay"}
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

        <Text style={styles.subtitle}>Grafik Delay (ms)</Text>
        <ScrollView horizontal={true} style={{ marginBottom: 20 }}>
          {logs.length > 0 ? (
            <LineChart
              data={delayChartData}
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
                formatYLabel: (yValue) => Math.round(Number(yValue)).toString(),
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
              Pilih sesi atau mulai tes untuk melihat grafik.
            </Text>
          )}
        </ScrollView>

        <View style={styles.separator} />

        <Text style={styles.subtitle}>Uji Throughput</Text>
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

        {/* Grafik Throughput */}
        <Text style={styles.subtitle}>Grafik Throughput (Req/s)</Text>
        <ScrollView horizontal={true} style={{ marginBottom: 20 }}>
          {throughputLogs.length > 0 ? (
            <LineChart
              data={throughputChartData}
              width={throughputChartWidth}
              height={250}
              yAxisSuffix=" r/s"
              fromZero={true}
              chartConfig={{
                backgroundColor: "#0288d1",
                backgroundGradientFrom: "#29b6f6",
                backgroundGradientTo: "#4fc3f7",
                decimalPlaces: 1,
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
              Data throughput belum tersedia.
            </Text>
          )}
        </ScrollView>

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
              title="<"
              onPress={() =>
                fetchThroughputLogs(selectedSessionId!, throughputPage - 1)
              }
              disabled={throughputPage <= 1}
            />
            <Text style={styles.paginationText}>
              {throughputPage} / {totalThroughputPages || 1}
            </Text>
            <Button
              title=">"
              onPress={() =>
                fetchThroughputLogs(selectedSessionId!, throughputPage + 1)
              }
              disabled={throughputPage >= totalThroughputPages}
            />
          </View>
        )}

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
      </ScrollView>
    </SafeAreaView>
  );
}
