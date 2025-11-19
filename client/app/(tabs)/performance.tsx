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
  const { getToken } = useAuth();
  const { user } = useUser();

  // State Data
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [logs, setLogs] = useState<PerformanceLog[]>([]);

  // State Tes
  const [isDelayTesting, setIsDelayTesting] = useState(false);
  const [isThroughputTesting, setIsThroughputTesting] = useState(false);
  const [throughputLogs, setThroughputLogs] = useState<ThroughputLog[]>([]);

  // State Multi-Device & Batch Export
  const [isMultiDeviceMode, setIsMultiDeviceMode] = useState(false);
  // Menyimpan daftar sesi dari tes terakhir (untuk ekspor massal)
  const [lastBatchSessions, setLastBatchSessions] = useState<
    { sessionId: string; deviceId: string }[]
  >([]);

  // Paginasi
  const [throughputPage, setThroughputPage] = useState(1);
  const [totalThroughputPages, setTotalThroughputPages] = useState(1);

  // --- SETUP AWAL ---
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
    };
  }, []);

  // --- LISTENER SOCKET ---
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.off("log_updated");
    socket.off("throughput_log_updated");

    const handleLogUpdate = ({ sessionId }: { sessionId: string }) => {
      // Update hanya jika sesi ini sedang dilihat ATAU kita sedang mode multi-device (opsional)
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

  // --- LOGIKA FETCH DATA ---
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

        // Auto select sesi terbaru jika tidak sedang tes
        if (!isDelayTesting && data.length > 0 && !selectedSessionId) {
          // Jika batch session kosong (baru buka app), anggap sesi terbaru device ini sebagai batch tunggal
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
    [isDelayTesting, getToken, selectedSessionId, lastBatchSessions]
  );

  useEffect(() => {
    if (selectedDevice) {
      // Jangan reset jika sedang tes multi-device
      if (!isDelayTesting && !isMultiDeviceMode) {
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

  // --- FUNGSI TES DELAY ---
  const startDelayTest = async () => {
    if (!selectedDevice && !isMultiDeviceMode) return;
    if (intervalRef.current)
      clearInterval(intervalRef.current as NodeJS.Timeout);

    setLogs([]);
    setThroughputLogs([]);

    // Tentukan target: 1 device atau SEMUA device
    const targets = isMultiDeviceMode ? devices : [selectedDevice!];
    if (targets.length === 0) return;

    try {
      const token = await getToken();
      const newBatch: { sessionId: string; deviceId: string }[] = [];

      // 1. Buat Sesi untuk SETIAP target (Batch Session)
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
          newBatch.push({ sessionId: session._id, deviceId: device._id });
        }
      });

      await Promise.all(sessionPromises);

      // Simpan info batch ini untuk ekspor nanti
      setLastBatchSessions(newBatch);

      // Tampilkan sesi milik device yg sedang dipilih di picker
      const currentDeviceSession = newBatch.find(
        (s) => s.deviceId === selectedDevice?._id
      );
      if (currentDeviceSession) {
        setSelectedSessionId(currentDeviceSession.sessionId);
        fetchSessions(selectedDevice!._id); // Refresh list
      }

      setIsDelayTesting(true);

      // Mulai Ping Loop
      const interval = setInterval(() => runPingBatch(newBatch), 1000);
      intervalRef.current = interval;
    } catch (error) {
      console.error("Gagal mulai tes:", error);
    }
  };

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

  const stopDelayTest = () => {
    if (intervalRef.current)
      clearInterval(intervalRef.current as NodeJS.Timeout);
    setIsDelayTesting(false);
    if (selectedDevice) fetchSessions(selectedDevice._id);
  };

  // --- FUNGSI TES THROUGHPUT ---
  const startThroughputTest = () => {
    // Cek apakah kita punya batch sesi yang valid
    if (lastBatchSessions.length === 0) {
      Alert.alert("Info", "Mulai Tes Delay dulu agar sesi terbentuk.");
      return;
    }

    setIsThroughputTesting(true);
    let commandsAcknowledged = 0;
    const testDuration = 5000;
    const commandsPerSecond = 50;
    const totalCommands = (testDuration / 1000) * commandsPerSecond;

    const interval = setInterval(() => {
      if (commandsAcknowledged >= totalCommands) return;

      // Pilih target acak dari batch yang sedang aktif
      const randomSession =
        lastBatchSessions[Math.floor(Math.random() * lastBatchSessions.length)];

      socketRef.current?.emit(
        "toggle_device",
        randomSession.deviceId,
        (res: any) => {
          if (res?.success) commandsAcknowledged++;
        }
      );
    }, 1000 / commandsPerSecond);

    setTimeout(() => {
      clearInterval(interval);
      setIsThroughputTesting(false);

      const result = commandsAcknowledged / (testDuration / 1000);

      // Simpan hasil ke SEMUA sesi di batch ini (asumsi throughput sistem terbagi rata)
      // Atau bisa juga simpan ke satu sesi 'master', tapi biar grafik muncul di semua device, kita simpan ke semua.
      lastBatchSessions.forEach(({ sessionId }) => {
        saveThroughputLog(sessionId, result);
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
    } catch (e) {
      console.error(e);
    }
  };

  // --- UI ---
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = logs.length > 5 ? logs.length * 60 : screenWidth - 32;

  const chartData = {
    labels: logs.map((log) => new Date(log.timestamp).toLocaleTimeString()),
    datasets: [
      { data: logs.length > 0 ? logs.map((log) => log.delay).reverse() : [0] },
    ],
  };
  const maxDelay =
    logs.length > 0 ? Math.max(...logs.map((log) => log.delay)) : 0;
  const yAxisSegmentCount = maxDelay <= 6 ? Math.ceil(maxDelay) || 1 : 5;

  // Nama File Ekspor: Single/Multi_Tanggal_User
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
                ? `Menguji ${devices.length} perangkat sekaligus`
                : "Hanya menguji perangkat yang dipilih"}
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

        {/* delay test */}
        <Button
          title={isDelayTesting ? "Hentikan Tes" : "Mulai Uji Coba Delay"}
          onPress={isDelayTesting ? stopDelayTest : startDelayTest}
          color={isDelayTesting ? "red" : Colors.light.tint}
        />

        {/* TOMBOL EKSPOR */}
        {lastBatchSessions.length > 0 && !isDelayTesting && (
          <View style={{ margin: 16 }}>
            <Button
              title={`📥 Download Data Excel (${lastBatchSessions.length} Device)`}
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
            <Text
              style={{
                textAlign: "center",
                fontSize: 10,
                color: "#666",
                marginTop: 5,
              }}
            >
              *Menggabungkan data Delay & Throughput semua perangkat dalam batch
              ini
            </Text>
          </View>
        )}

        {/* Grafik delay */}
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

        <View style={styles.separator} />

        {/* throughput test */}
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

        <Text style={styles.subtitle}>Tabel Log Throughput</Text>
        {throughputLogs.map((log) => (
          <View style={styles.tableRow} key={log._id}>
            <Text>{new Date(log.timestamp).toLocaleString("id-ID")}</Text>
            <Text>{log.result.toFixed(2)}</Text>
          </View>
        ))}

        <Text style={styles.subtitle}>Tabel Log Delay</Text>
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
