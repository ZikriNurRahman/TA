import { StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

export const globalStyles = StyleSheet.create({
  // Styles for HomeScreen (index.tsx)
  homeContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50, // Sesuaikan jika perlu
    marginBottom: 20,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 24,
    lineHeight: 28,
  },

  // Styles for DeviceCard.tsx
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deviceIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  deviceTextContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  deviceSubtitle: {
    fontSize: 20,
    fontWeight: "bold",
  },

  // Styles for AddDeviceScreen (add-device.tsx)
  addDeviceContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  addDeviceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  addDeviceInput: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
  },
  messageContainer: {
    marginTop: 20,
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
});

// Style dinamis untuk DeviceCard
export const dynamicCardStyles = {
  on: {
    backgroundColor: Colors.light.tint,
    titleColor: "#fff",
    statusColor: "#eee",
  },
  off: {
    backgroundColor: "#fff",
    titleColor: "#000",
    statusColor: "#666",
  },
};
