import { StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

export const globalStyles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: "#f5f5f5",
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
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
  messageContainer: {
    marginTop: 20,
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
});

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
