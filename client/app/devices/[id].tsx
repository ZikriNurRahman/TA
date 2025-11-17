import {
  View,
  Text,
  ActivityIndicator,
  Button,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Device } from "@/types/Device";
import { idStyles, addDeviceStyles } from "@/styles/styles";
import { ConfirmModal } from "@/components/ConfirmModal";
import { API_URL } from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Mengambil ID dari URL
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const { getToken } = useAuth();

  const fetchDevice = async () => {
    try {
      setLoading(true);

      // ambil token
      const token = await getToken();

      const response = await fetch(`${API_URL}/devices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Perangkat tidak ditemukan");

      const data = await response.json();
      setDevice(data);
      setNewName(data.name); // Set nama awal untuk input edit
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memuat data perangkat.");
      router.back(); // Kembali jika error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDevice();
  }, [id]);

  // fungsi delete
  const handleDelete = async () => {
    setIsModalVisible(false); // Tutup modal dulu

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/devices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok)
        throw new Error("Gagal menghapus perangkat dari server.");

      router.back(); // Kembali ke halaman utama setelah berhasil
    } catch (error) {
      console.error(error);
      Alert.alert("Gagal menghapus perangkat.");
    }
  };

  // Fungsi untuk menampilkan konfirmasi sebelum menghapus
  const confirmDelete = () => {
    setIsModalVisible(true);
  };

  // Fungsi untuk menyimpan perubahan nama
  const handleSave = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Nama tidak boleh kosong.");
      return;
    }

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
      setDevice(updatedDevice); // Perbarui state dengan data baru dari server
      setIsEditing(false); // Keluar dari mode edit
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan perubahan.");
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  if (!device) {
    return (
      <SafeAreaView style={idStyles.container}>
        <Text style={idStyles.errorText}>Perangkat tidak ditemukan.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={idStyles.container}>
      {isEditing ? (
        <TextInput
          style={addDeviceStyles.input} // Kita bisa pakai style yang sama
          value={newName}
          onChangeText={setNewName}
          autoFocus={true}
        />
      ) : (
        <Text style={idStyles.title}>{device.name}</Text>
      )}

      <Text style={idStyles.detail}>MAC Address: {device._id}</Text>
      <Text style={idStyles.detail}>Tipe: {device.type}</Text>
      <Text style={idStyles.detail}>
        Status: {device.isOn ? "Menyala" : "Mati"}
      </Text>

      <View style={idStyles.buttonContainer}>
        {isEditing ? (
          <Button title="Simpan" onPress={handleSave} />
        ) : (
          <Button title="Edit Nama" onPress={() => setIsEditing(true)} />
        )}
        <View style={{ marginTop: 10 }}>
          <Button title="Hapus Perangkat" color="red" onPress={confirmDelete} />
        </View>
      </View>

      <ConfirmModal
        visible={isModalVisible}
        title="Hapus Perangkat"
        message={`Apakah Anda yakin ingin menghapus "${device.name}"?`}
        onCancel={() => setIsModalVisible(false)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}
