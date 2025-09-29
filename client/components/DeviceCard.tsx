import React from "react";
import { Switch, Text, View } from "react-native";
import { Device } from "@/types/Device";
import { globalStyles, dynamicCardStyles } from "@/styles/styles"; // <-- Import

type DeviceCardProps = {
  device: Device;
  onToggle: () => void;
};

export function DeviceCard({ device, onToggle }: DeviceCardProps) {
  const icon = device.type === "light" ? "💡" : "💨";

  // Pilih style dinamis berdasarkan status 'isOn'
  const styles = device.isOn ? dynamicCardStyles.on : dynamicCardStyles.off;

  return (
    <View
      style={[
        globalStyles.deviceCard,
        { backgroundColor: styles.backgroundColor },
      ]}
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
      <Switch
        trackColor={{ false: "#767577", true: "#81b0ff" }}
        thumbColor={device.isOn ? "#f5dd4b" : "#f4f3f4"}
        onValueChange={onToggle}
        value={device.isOn}
      />
    </View>
  );
}
