import { StyleSheet } from "react-native";

export const createStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    messageContainer: {
      marginTop: 20,
      alignItems: "center",
      padding: 15,
      borderRadius: 8,
      backgroundColor: "#f0f0f0",
    },
  });
};
