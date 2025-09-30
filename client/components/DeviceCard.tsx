import React from "react";
import { Switch, Text, View, TouchableOpacity, Pressable } from "react-native";
import { Device } from "@/types/Device";
import { globalStyles, dynamicCardStyles } from "@/styles/styles";
import { useRouter } from "expo-router";

type DeviceCardProps = {
  device: Device;
  onToggle: () => void;
};

export function DeviceCard({ device, onToggle }: DeviceCardProps) {
  const router = useRouter();
  const icon = device.type === "light" ? "" : "";
  const styles = device.isOn ? dynamicCardStyles.on : dynamicCardStyles.off;

  // Fungsi untuk menangani navigasi
  const handleNavigation = () => {
    router.push({
      pathname: "/devices/[id]",
      params: { id: device._id },
    });
  };

  return (
    // Gunakan View sebagai pembungkus luar
    <View
      style={[
        globalStyles.deviceCard,
        { backgroundColor: styles.backgroundColor },
      ]}
    >
      {/* Gunakan Pressable untuk area navigasi */}
      <Pressable
        onPress={handleNavigation}
        style={{ flexDirection: "row", flex: 1, alignItems: "center" }}
      >
        <Text style={globalStyles.deviceIcon}>{icon}</Text>
        <View style={globalStyles.deviceTextContainer}>
          <Text
            style={[globalStyles.deviceSubtitle, { color: styles.titleColor }]}
          >
            {device.name}
          </Text>
          <Text style={{ color: styles.statusColor }}>
            Status: {device.isOn ? "Menyala" : "Mati"}
          </Text>
        </View>
      </Pressable>
      {/* Switch berada di luar Pressable, sehingga event-nya terisolasi */}
      <Switch
        trackColor={{ false: "#767577", true: "#81b0ff" }}
        thumbColor={device.isOn ? "#f5dd4b" : "#f4f3f4"}
        onValueChange={onToggle}
        value={device.isOn}
      />
    </View>
  );
}
