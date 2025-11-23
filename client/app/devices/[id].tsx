import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Device } from "@/types/Device";
import { idStyles as styles } from "@/styles/styles";
import { ConfirmModal } from "@/components/ConfirmModal";
import { API_URL } from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { ModernButton } from "@/components/ui/ModernButton";

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  // State Modal & Edit
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { getToken } = useAuth();

  const fetchDevice = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/devices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok)
        throw new Error("Perangkat tidak ditemukan atau akses ditolak");
      const data = await response.json();
      setDevice(data);
      setNewName(data.name);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memuat data perangkat.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDevice();
  }, [id]);

  // fungsi delete
  const handleDelete = async () => {
    setIsModalVisible(false);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/devices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Gagal menghapus perangkat.");

      Alert.alert("Sukses", "Perangkat berhasil dihapus.");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menghapus perangkat.");
    }
  };

  // Fungsi untuk menyimpan perubahan nama
  const handleSave = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Nama tidak boleh kosong.");
      return;
    }
    setIsSaving(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/devices/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan perubahan");

      const updatedDevice = await response.json();
      setDevice(updatedDevice);
      setIsEditing(false);
      Alert.alert("Sukses", "Nama perangkat diperbarui.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Text
          style={{
            fontSize: 18,
            textAlign: "center",
            color: "red",
          }}
        >
          Perangkat tidak ditemukan.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Detail Perangkat</Text>

        {/* KARTU 1: STATUS HEADER */}
        <Card style={{ alignItems: "center", paddingVertical: 30 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: device.isOn ? "#D1FAE5" : "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
              borderWidth: 1,
              borderColor: device.isOn ? Colors.light.success : "#E5E7EB",
            }}
          >
            <Ionicons
              name={device.type === "fan" ? "aperture" : "bulb"}
              size={40}
              color={device.isOn ? Colors.light.success : Colors.light.icon}
            />
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: Colors.light.text,
              marginBottom: 4,
            }}
          >
            {device.name}
          </Text>

          <Text
            style={{
              color: Colors.light.textSecondary,
              fontSize: 14,
              fontFamily: "SpaceMono",
            }}
          >
            ID: {device._id}
          </Text>

          <View
            style={{
              marginTop: 15,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: device.isOn ? Colors.light.success : "#E5E7EB",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 12 }}>
              STATUS: {device.isOn ? "MENYALA (ON)" : "MATI (OFF)"}
            </Text>
          </View>
        </Card>

        {/* KARTU 2: EDIT INFORMASI */}
        <Card>
          <Text style={styles.sectionTitle}>Pengaturan</Text>

          {isEditing ? (
            <View>
              <Text
                style={{
                  fontWeight: "600",
                  marginBottom: 6,
                  color: Colors.light.text,
                }}
              >
                Ubah Nama:
              </Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                autoFocus={true}
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
                <View style={{ flex: 1 }}>
                  <ModernButton
                    title="Batal"
                    variant="outline"
                    onPress={() => {
                      setIsEditing(false);
                      setNewName(device.name); // Reset nama
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ModernButton
                    title="Simpan"
                    onPress={handleSave}
                    loading={isSaving}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{ color: Colors.light.textSecondary, fontSize: 14 }}
                >
                  Nama Perangkat
                </Text>
                <Text
                  style={{
                    fontWeight: "600",
                    fontSize: 16,
                    color: Colors.light.text,
                  }}
                >
                  {device.name}
                </Text>
              </View>
              <ModernButton
                title="Ubah"
                variant="outline"
                onPress={() => setIsEditing(true)}
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  marginVertical: 0,
                }}
              />
            </View>
          )}

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#F3F4F6",
              marginVertical: 15,
            }}
          />

          <View>
            <Text style={{ color: Colors.light.textSecondary, fontSize: 14 }}>
              Tipe Perangkat
            </Text>
            <Text
              style={{
                fontWeight: "600",
                fontSize: 16,
                color: Colors.light.text,
                textTransform: "capitalize",
              }}
            >
              {device.type === "fan" ? "Kipas Angin (Fan)" : "Lampu (Light)"}
            </Text>
          </View>
        </Card>

        {/* KARTU 3: DANGER ZONE */}
        <Card style={{ borderColor: "#FEE2E2", backgroundColor: "#FEF2F2" }}>
          <Text style={[styles.sectionTitle, { color: Colors.light.danger }]}>
            Danger Zone
          </Text>
          <Text
            style={{
              color: Colors.light.textSecondary,
              marginBottom: 15,
              fontSize: 13,
            }}
          >
            Menghapus perangkat ini akan menghilangkan semua data riwayat
            pengujian yang terkait secara permanen.
          </Text>
          <ModernButton
            title="Hapus Perangkat Ini"
            variant="danger"
            onPress={() => setIsModalVisible(true)}
          />
        </Card>
      </ScrollView>

      <ConfirmModal
        visible={isModalVisible}
        title="Hapus Perangkat?"
        message={`Apakah Anda yakin ingin menghapus "${device.name}" selamanya?`}
        onCancel={() => setIsModalVisible(false)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}
