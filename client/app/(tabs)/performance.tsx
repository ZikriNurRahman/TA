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
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Device } from "@/types/Device";
import { PerformanceLog } from "@/types/PerformanceLog";
import { TestSession } from "@/types/TestSession";
import { ThroughputLog } from "@/types/ThroughputLog";
import { performanceStyles as styles } from "@/styles/styles";
import { Colors } from "@/constants/Colors";
import { API_URL } from "@/constants/api";
import { exportBatchToCSV } from "@/utils/csvExporter";
import { Card } from "@/components/ui/Card";
import { ModernButton } from "@/components/ui/ModernButton";

export default function PerformanceScreen() {
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);

  // Ref tambahan untuk timer throughput agar bisa dibatalkan
  const throughputTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const throughputIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  // Ref untuk Traffic (Kirim perintah terus menerus)
  const throughputTrafficRef = useRef<NodeJS.Timeout | number | null>(null);
  // Ref untuk Reporting (Simpan data tiap 5 detik)
  const throughputReportRef = useRef<NodeJS.Timeout | number | null>(null);
  // Ref untuk menyimpan Counter agar tidak hilang antar interval
  const ackCountersRef = useRef<Record<string, number>>({});

  const { getToken } = useAuth();
  const { user } = useUser();

  // State Data
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );

  // State Logs
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [isTesting, setIsTesting] = useState(false); // Menggantikan isDelayTesting
  const [isThroughputTesting, setIsThroughputTesting] = useState(false); // Status spesifik throughput
  const [throughputLogs, setThroughputLogs] = useState<ThroughputLog[]>([]);
  const [throughputPage, setThroughputPage] = useState(1);
  const [totalThroughputPages, setTotalThroughputPages] = useState(1);

  // State Multi-Device
  const [isMultiDeviceMode, setIsMultiDeviceMode] = useState(false);
  const [lastBatchSessions, setLastBatchSessions] = useState<
    { sessionId: string; deviceId: string }[]
  >([]);

  // --- SETUP AWAL ---
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${API_URL}/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Gagal ambil perangkat");

        const data = await response.json();
        if (Array.isArray(data)) {
          setDevices(data);
          if (data.length > 0 && !selectedDevice) setSelectedDevice(data[0]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchDevices();

    socketRef.current = io(API_URL);
    socketRef.current.on("devices_updated", () => fetchDevices());

    return () => {
      socketRef.current?.disconnect();
      if (intervalRef.current)
        clearInterval(intervalRef.current as NodeJS.Timeout);
      if (throughputIntervalRef.current)
        clearInterval(throughputIntervalRef.current as NodeJS.Timeout);
      if (throughputTimeoutRef.current)
        clearTimeout(throughputTimeoutRef.current as NodeJS.Timeout);
    };
  }, []);

  // --- LISTENER SOCKET ---
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

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

    return () => {
      socket.off("log_updated");
      socket.off("throughput_log_updated");
    };
  }, [selectedSessionId]);

  // --- FETCH DATA ---
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
        const data: TestSession[] = await response.json();
        setSessions(data);

        if (!isTesting && data.length > 0 && !selectedSessionId) {
          // Jika baru buka, set session ke yang terbaru kalau ada
          if (lastBatchSessions.length === 0) {
            setLastBatchSessions([{ sessionId: data[0]._id, deviceId }]);
          }
          setSelectedSessionId(data[0]._id);
        } else if (data.length === 0) {
          setSelectedSessionId(null);
          setLogs([]);
          setThroughputLogs([]);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [isTesting, getToken, selectedSessionId, lastBatchSessions]
  );

  useEffect(() => {
    if (selectedDevice) {
      if (!isTesting && !isMultiDeviceMode) {
        setSelectedSessionId(null);
        fetchSessions(selectedDevice._id);
      }
    }
  }, [selectedDevice]);

  const fetchLogs = async (sessionId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/sessions/${sessionId}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchThroughputLogs = async (sessionId: string, page: number) => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/sessions/${sessionId}/throughput-logs?page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setThroughputLogs(data.logs);
      setThroughputPage(data.currentPage);
      setTotalThroughputPages(data.totalPages);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchLogs(selectedSessionId);
      fetchThroughputLogs(selectedSessionId, 1);
    }
  }, [selectedSessionId]);

  // --- FUNGSI UTAMA: START STRESS TEST ---
  const startStressTest = async () => {
    const targets = isMultiDeviceMode
      ? devices
      : selectedDevice
      ? [selectedDevice]
      : [];

    if (targets.length === 0) {
      Alert.alert("Error", "Tidak ada perangkat untuk diuji.");
      return;
    }

    // Reset semua timer lama jika ada
    stopTest();

    setLogs([]);
    setThroughputLogs([]);
    setLastBatchSessions([]);

    try {
      const token = await getToken();
      const newBatch: { sessionId: string; deviceId: string }[] = [];

      // 1. Buat Sesi (Sequential agar server aman)
      for (const device of targets) {
        try {
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
            newBatch.push({ sessionId: session._id, deviceId: device._id });
          }
        } catch (err) {
          console.error(`Skip device ${device.name}`);
        }
      }

      if (newBatch.length === 0) {
        Alert.alert("Gagal", "Tidak ada sesi yang berhasil dibuat.");
        return;
      }

      setLastBatchSessions(newBatch);

      // Update Tampilan ke sesi milik device yg dipilih
      const currentDeviceSession = newBatch.find(
        (s) => s.deviceId === selectedDevice?._id
      );
      if (currentDeviceSession) {
        setSelectedSessionId(currentDeviceSession.sessionId);
        if (selectedDevice) fetchSessions(selectedDevice._id);
      } else if (newBatch.length > 0) {
        setSelectedSessionId(newBatch[0].sessionId);
      }

      // 2. Mulai Tes
      setIsTesting(true);

      // A. Jalankan Ping Loop (Delay) - Jalan terus sampai dihentikan
      const pingInterval = setInterval(() => runPingBatch(newBatch), 1000);
      intervalRef.current = pingInterval;

      // B. Jalankan Throughput Loop - Jalan otomatis selama 5 detik
      runThroughputBatch(newBatch);
    } catch (error) {
      console.error("Gagal mulai tes:", error);
    }
  };

  const stopTest = () => {
    // 1. Stop Ping
    if (intervalRef.current)
      clearInterval(intervalRef.current as NodeJS.Timeout);
    intervalRef.current = null;

    // 2. Stop Traffic Loop
    if (throughputTrafficRef.current)
      clearInterval(throughputTrafficRef.current as NodeJS.Timeout);
    throughputTrafficRef.current = null;

    // 3. Stop Reporting Loop
    if (throughputReportRef.current)
      clearInterval(throughputReportRef.current as NodeJS.Timeout);
    throughputReportRef.current = null;

    setIsTesting(false);
    setIsThroughputTesting(false);

    if (selectedDevice) fetchSessions(selectedDevice._id);
  };

  // Logika Ping Massal
  const runPingBatch = (batch: { sessionId: string }[]) => {
    batch.forEach(({ sessionId }) => {
      const start = Date.now();
      socketRef.current?.emit("ping", () => {
        const delay = Date.now() - start;
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
    } catch (e) {
      console.error(e);
    }
  };

  // Logika Throughput Massal
  const runThroughputBatch = (
    batchSessions: { sessionId: string; deviceId: string }[]
  ) => {
    setIsThroughputTesting(true);

    // 1. Reset Counter di Ref
    ackCountersRef.current = {};
    batchSessions.forEach((s) => (ackCountersRef.current[s.deviceId] = 0));

    const reportIntervalSec = 5; // Lapor setiap 5 detik
    const commandsPerSecond = 50; // Target beban server
    const trafficIntervalTime = 1000 / commandsPerSecond;

    // --- LOOP A: TRAFFIC (Jalan Cepat) ---
    // Tugas: Membanjiri server dengan request
    const trafficInterval = setInterval(() => {
      // Pilih target acak
      const randomSession =
        batchSessions[Math.floor(Math.random() * batchSessions.length)];
      const targetDeviceId = randomSession.deviceId;

      socketRef.current?.emit("toggle_device", targetDeviceId, (res: any) => {
        if (res?.success) {
          // Tambah counter di Ref (Aman dari reset render)
          if (ackCountersRef.current[targetDeviceId] !== undefined) {
            ackCountersRef.current[targetDeviceId]++;
          } else {
            ackCountersRef.current[targetDeviceId] = 1;
          }
        }
      });
    }, trafficIntervalTime);

    throughputTrafficRef.current = trafficInterval;

    // --- LOOP B: REPORTING (Jalan Tiap 5 Detik) ---
    // Tugas: Menghitung hasil 5 detik terakhir, simpan, lalu reset
    const reportInterval = setInterval(() => {
      console.log("📊 Melaporkan Throughput 5 Detik Terakhir...");

      batchSessions.forEach(({ sessionId, deviceId }) => {
        // Ambil jumlah sukses dari Ref
        const count = ackCountersRef.current[deviceId] || 0;

        // Hitung rata-rata per detik (Jumlah Sukses / 5 detik)
        const result = count / reportIntervalSec;

        // Simpan ke database
        saveThroughputLog(sessionId, result);

        // PENTING: Reset counter ke 0 untuk siklus 5 detik berikutnya!
        ackCountersRef.current[deviceId] = 0;
      });
    }, reportIntervalSec * 1000);

    throughputReportRef.current = reportInterval;
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
    } catch (e) {
      console.error(e);
    }
  };

  // --- UI ---
  const screenWidth = Dimensions.get("window").width;

  // Config Grafik Delay
  const delayChartData = {
    labels: logs
      .map((log) => new Date(log.timestamp).toLocaleTimeString())
      .reverse(),
    datasets: [
      { data: logs.length > 0 ? logs.map((log) => log.delay).reverse() : [0] },
    ],
  };
  const delayChartWidth = logs.length > 5 ? logs.length * 60 : screenWidth - 32;
  const maxDelay =
    logs.length > 0 ? Math.max(...logs.map((log) => log.delay)) : 0;
  const yAxisSegmentCount = maxDelay <= 6 ? Math.ceil(maxDelay) || 1 : 5;

  // Config Grafik Throughput
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

  const getExportFileName = () => {
    const type = isMultiDeviceMode ? "MultiDevice" : "SingleDevice";
    const date = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const username = user?.firstName || "User";
    return `${type}_${date}_${username}`;
  };

  // Konfigurasi grafik yang lebih bersih dan modern
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Warna Biru Primary dengan Opacity
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Warna text abu-abu
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4", // Ukuran titik data
      strokeWidth: "2",
      stroke: "#2563EB", // Warna border titik
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // Garis solid, bukan putus-putus (lebih rapi)
      stroke: "#E5E7EB", // Warna garis grid sangat halus
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Analisis Performa</Text>

        {/* KARTU KONTROL */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pengaturan Tes</Text>

          {/* Switch Row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
              marginBottom: 15,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: Colors.light.text,
                }}
              >
                Uji Semua Perangkat
              </Text>
              <Text style={{ fontSize: 12, color: Colors.light.textSecondary }}>
                Target:{" "}
                {isMultiDeviceMode
                  ? `${devices.length} Devices`
                  : "Single Device"}
              </Text>
            </View>
            <Switch
              value={isMultiDeviceMode}
              onValueChange={setIsMultiDeviceMode}
              trackColor={{ false: "#E5E7EB", true: Colors.light.primary }}
            />
          </View>

          {/* Picker */}
          {!isMultiDeviceMode && (
            <View
              style={[styles.input, { padding: 0, justifyContent: "center" }]}
            >
              <Picker
                selectedValue={selectedDevice?._id}
                onValueChange={(itemValue) => {
                  const device = devices.find((d) => d._id === itemValue);
                  setSelectedDevice(device || null);
                }}
                style={{ height: 50, width: "100%" }}
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
          )}

          {/* Tombol Utama */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: isTesting
                  ? Colors.light.danger
                  : Colors.light.primary,
              },
            ]}
            onPress={isTesting ? stopTest : startStressTest}
          >
            <Text style={styles.buttonText}>
              {isTesting ? "⏹ Hentikan Stress Test" : "▶ Mulai Stress Test"}
            </Text>
          </TouchableOpacity>

          {/* Status Loading */}
          {isThroughputTesting && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: 10,
                gap: 8,
              }}
            >
              <ActivityIndicator color={Colors.light.warning} />
              <Text style={{ color: Colors.light.warning, fontWeight: "600" }}>
                Sedang membanjiri traffic...
              </Text>
            </View>
          )}
        </View>

        {/* KARTU RIWAYAT & EKSPOR */}
        <View style={styles.card}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={styles.sectionTitle}>Riwayat Sesi</Text>

            {/* Tombol Download Kecil di Header Card */}
            {lastBatchSessions.length > 0 && !isTesting && (
              <TouchableOpacity
                onPress={async () => {
                  const token = await getToken();
                  if (token)
                    await exportBatchToCSV(
                      lastBatchSessions,
                      devices,
                      token,
                      getExportFileName()
                    );
                }}
                style={{
                  backgroundColor: Colors.light.success,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 12, fontWeight: "bold" }}
                >
                  📥 Download CSV
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {sessions.map((session, index) => (
              <TouchableOpacity
                key={session._id}
                style={{
                  padding: 12,
                  backgroundColor:
                    selectedSessionId === session._id ? "#EFF6FF" : "#FFF",
                  borderRadius: 8,
                  marginBottom: 4,
                  borderWidth: 1,
                  borderColor:
                    selectedSessionId === session._id
                      ? Colors.light.primary
                      : "#F3F4F6",
                }}
                onPress={() => !isTesting && setSelectedSessionId(session._id)}
              >
                <Text
                  style={{
                    color:
                      selectedSessionId === session._id
                        ? Colors.light.primary
                        : Colors.light.text,
                    fontWeight: "600",
                  }}
                >
                  Sesi #{sessions.length - index}
                </Text>
                <Text
                  style={{ fontSize: 12, color: Colors.light.textSecondary }}
                >
                  {new Date(session.startTime).toLocaleString("id-ID")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* KARTU GRAFIK DELAY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Grafik Delay (ms)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* ... Kode LineChart Delay (Sama seperti sebelumnya) ... */}
            {/* Pastikan backgroundColor di chartConfig diubah jadi '#ffffff' agar nyatu dengan kartu */}
            <LineChart
              data={delayChartData}
              width={delayChartWidth}
              height={250}
              yAxisSuffix=" ms"
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Warna Biru
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#2563EB" },
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </ScrollView>
          {/* Tabel Delay */}
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Timestamp</Text>
            <Text style={styles.tableHeaderText}>Value</Text>
          </View>
          {logs.slice(0, 5).map(
            (
              log // Tampilkan 5 saja biar rapi
            ) => (
              <View style={styles.tableRow} key={log._id}>
                <Text style={styles.tableText}>
                  {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                </Text>
                <Text
                  style={{ fontWeight: "bold", color: Colors.light.primary }}
                >
                  {log.delay} ms
                </Text>
              </View>
            )
          )}
        </View>

        {/* KARTU GRAFIK THROUGHPUT */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Grafik Throughput</Text>
          {/* ... Kode LineChart Throughput ... */}
          <LineChart
            data={throughputChartData}
            width={throughputChartWidth}
            height={250}
            yAxisSuffix=" r/s"
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Warna Hijau
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#10B981" },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
          {/* Tabel Throughput */}
          {/* ... kode tabel throughput ... */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
