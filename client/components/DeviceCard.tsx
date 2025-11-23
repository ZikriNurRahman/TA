import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { Link } from "expo-router";
import { Device } from "@/types/Device";
import { Colors } from "@/constants/Colors";
import { dashboardStyles } from "@/styles/styles";
import { Ionicons } from "@expo/vector-icons";

interface DeviceCardProps {
  device: Device;
  onToggle: () => void;
}

export function DeviceCard({ device, onToggle }: DeviceCardProps) {
  return (
    // 1. Wadah Kartu (Hanya View biasa, bukan tombol)
    <View style={dashboardStyles.card}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* 2. Area Kiri: Navigasi ke Detail (Dibungkus Link) */}
        <Link href={`/devices/${device._id}`} asChild>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: device.isOn ? "#D1FAE5" : "#F3F4F6" },
              ]}
            >
              <Ionicons
                name={device.type === "fan" ? "aperture" : "bulb"}
                size={24}
                color={device.isOn ? Colors.light.success : Colors.light.icon}
              />
            </View>

            <View>
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceType}>
                {device.type === "fan" ? "Kipas Angin" : "Lampu"}
              </Text>
            </View>
          </TouchableOpacity>
        </Link>

        {/* 3. Area Kanan: Switch (Di luar Link, tidak memicu navigasi) */}
        <View style={{ alignItems: "center", paddingLeft: 10 }}>
          <Switch
            value={device.isOn}
            onValueChange={onToggle}
            trackColor={{ false: "#E5E7EB", true: Colors.light.success }}
            thumbColor={"#FFFFFF"}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: device.isOn
                  ? Colors.light.success
                  : Colors.light.textSecondary,
              },
            ]}
          >
            {device.isOn ? "ON" : "OFF"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  deviceType: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textTransform: "capitalize",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
  },
});
