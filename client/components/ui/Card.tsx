import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@/constants/Colors";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12, // Sudut melengkung
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 2, // Sedikit margin horizontal
    // Efek Bayangan (Shadow) agar terlihat timbul
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2, // Shadow untuk Android
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
});
