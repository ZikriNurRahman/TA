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

export default function PerformanceScreen() {
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);
  // Ref tambahan untuk timer throughput agar bisa dibatalkan
  const throughputTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const throughputIntervalRef = useRef<NodeJS.Timeout | number | null>(null);

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

  // --- FUNGSI UTAMA: START STRESS TEST (GABUNGAN) ---
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
    // 1. Matikan Ping Loop
    if (intervalRef.current)
      clearInterval(intervalRef.current as NodeJS.Timeout);
    intervalRef.current = null;

    // 2. Matikan Throughput Loop (jika user stop sebelum 5 detik)
    if (throughputIntervalRef.current)
      clearInterval(throughputIntervalRef.current as NodeJS.Timeout);
    throughputIntervalRef.current = null;

    // 3. Batalkan Timer 5 detik (agar data tidak tersimpan jika di-stop)
    if (throughputTimeoutRef.current)
      clearTimeout(throughputTimeoutRef.current as NodeJS.Timeout);
    throughputTimeoutRef.current = null;

    // Reset semua status UI
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

    let commandsAcknowledged = 0;
    const testDuration = 5000; // 5 Detik
    const commandsPerSecond = 50;
    const totalCommands = (testDuration / 1000) * commandsPerSecond;

    // Counter individual per device
    const ackCounter: Record<string, number> = {};
    batchSessions.forEach((s) => (ackCounter[s.deviceId] = 0));

    // Target total tembakan (dibagi rata atau dikali?) -> Stress test biasanya "Total System Load"
    // Kita set target total 50 req/s ke server (beban konstan), didistribusikan ke device
    // Atau jika mau stress berat: 50 req/s PER DEVICE? Hati-hati server gratisan meledak.
    // Kita pakai: Total 50 req/s (untuk simulasi beban moderat)
    const totalTargetRate = isMultiDeviceMode ? 50 : 50;

    const intervalTime = 1000 / totalTargetRate;

    const interval = setInterval(() => {
      if (commandsAcknowledged >= totalCommands) return;

      // Pilih target acak dari batch yang sedang aktif
      const randomSession =
        batchSessions[Math.floor(Math.random() * batchSessions.length)];

      socketRef.current?.emit(
        "toggle_device",
        randomSession.deviceId,
        (res: any) => {
          if (res?.success) commandsAcknowledged++;
        }
      );
    }, 1000 / commandsPerSecond);

    throughputIntervalRef.current = interval;

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsThroughputTesting(false); // Matikan indikator

      const result = commandsAcknowledged / (testDuration / 1000);

      // Simpan hasil ke semua sesi
      batchSessions.forEach(({ sessionId }) => {
        saveThroughputLog(sessionId, result);
      });
    }, testDuration);

    throughputTimeoutRef.current = timeout;
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Uji Performa Jaringan</Text>

        {/* SWITCH MODE */}
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
                ? `Target: ${devices.length} perangkat`
                : "Target: 1 perangkat terpilih"}
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
            enabled={!isMultiDeviceMode}
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

        {/* SATU TOMBOL UNTUK SEMUA */}
        <Button
          title={
            isTesting
              ? "Hentikan Stress Test"
              : "Mulai Stress Test (Delay & Throughput)"
          }
          onPress={isTesting ? stopTest : startStressTest}
          color={isTesting ? "red" : Colors.light.tint}
        />
        {isThroughputTesting && (
          <Text
            style={{
              textAlign: "center",
              marginTop: 5,
              color: "#e67e22",
              fontWeight: "bold",
            }}
          >
            ⚡ Sedang membanjiri traffic (Throughput Test)...
          </Text>
        )}

        {/* DOWNLOAD BUTTON */}

        {lastBatchSessions.length > 0 && !isTesting && (
          <View style={{ margin: 16 }}>
            <Button
              title={`📥 Download Data Excel (${devices.length} Device)`}
              color="#2ecc71"
              onPress={async () => {
                const token = await getToken();
                if (token) {
                  await exportBatchToCSV(
                    lastBatchSessions,
                    devices,
                    token,
                    getExportFileName()
                  );
                }
              }}
            />
          </View>
        )}

        <Text style={styles.subtitle}>Riwayat Percobaan</Text>

        <View style={{ marginBottom: 20 }}>
          {sessions.map((session, index) => (
            <TouchableOpacity
              key={session._id}
              style={[
                styles.historyItem,
                selectedSessionId === session._id && styles.historyItemSelected,
              ]}
              onPress={() => !isTesting && setSelectedSessionId(session._id)}
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
              width={delayChartWidth}
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
              Grafik akan muncul saat tes dimulai.
            </Text>
          )}
        </ScrollView>

        <Text style={styles.subtitle}>Grafik Throughput (Req/s)</Text>
        <ScrollView horizontal={true} style={{ marginBottom: 20 }}>
          {throughputLogs.length > 0 ? (
            <LineChart
              data={throughputChartData}
              width={throughputChartWidth}
              height={300}
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
              Data throughput muncul setelah 5 detik.
            </Text>
          )}
        </ScrollView>

        {/* Tabel Log & Paginasi... (Bagian ini tetap sama) */}
        <Text style={styles.subtitle}>Tabel Log Throughput</Text>
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
