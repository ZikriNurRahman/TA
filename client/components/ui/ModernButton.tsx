import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { Colors } from "@/constants/Colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "danger" | "outline" | "success";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function ModernButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: ButtonProps) {
  let backgroundColor = Colors.light.tint;
  let textColor = "#FFF";
  let borderWidth = 0;
  let borderColor = "transparent";

  if (variant === "danger") backgroundColor = Colors.light.danger;
  if (variant === "success") backgroundColor = Colors.light.success;
  if (variant === "outline") {
    backgroundColor = "transparent";
    textColor = Colors.light.tint;
    borderWidth = 1;
    borderColor = Colors.light.tint;
  }

  if (disabled) {
    backgroundColor = "#D1D5DB"; // Abu-abu disable
    borderColor = "transparent";
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, borderWidth, borderColor },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? Colors.light.tint : "#FFF"}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: disabled && variant === "outline" ? "#9CA3AF" : textColor,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    // Shadow halus untuk tombol primary
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
