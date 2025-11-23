import { StyleSheet, Platform } from "react-native";
import { Colors } from "@/constants/Colors";

const isWeb = Platform.OS === "web";

// Style Umum untuk Dashboard
export const dashboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 12,
    marginTop: 8,
  },
  // --- KOMPONEN KARTU (CARD) ---
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    // Shadow halus
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  // --- BUTTONS ---
  primaryButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  dangerButton: {
    backgroundColor: Colors.light.danger,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  // --- INPUTS ---
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 12,
  },
  // --- LOGS ---
  logContainer: {
    backgroundColor: "#1F2937", // Gelap seperti terminal
    borderRadius: 8,
    padding: 12,
    height: 250,
  },
  logText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "#10B981", // Teks hijau terminal
    marginBottom: 4,
  },
  // --- TABLES ---
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.border,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableHeaderText: {
    fontWeight: "bold",
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  tableText: {
    color: Colors.light.text,
    fontSize: 14,
  },
});

// Export alias agar kompatibel dengan kode lama Anda
export const homeStyles = dashboardStyles;
export const performanceStyles = dashboardStyles;
export const addDeviceStyles = dashboardStyles;
export const idStyles = dashboardStyles;

// Style dinamis untuk DeviceCard
export const dynamicCardStyles = {
  on: {
    backgroundColor: Colors.light.tint,
    titleColor: "#fff",
    statusColor: "#e0e0e0",
    // Tambahkan shadow saat aktif
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  off: {
    backgroundColor: "#fff",
    titleColor: "#000",
    statusColor: "#666",
    // Tambahkan shadow yang lebih soft saat tidak aktif
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
};

// Styles untuk ConfirmModal.tsx
export const confirmModalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
});
