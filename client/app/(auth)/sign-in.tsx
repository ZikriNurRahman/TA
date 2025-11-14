import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { addDeviceStyles as styles } from "@/styles/styles";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // State untuk pesan error khusus
  const [errorMessage, setErrorMessage] = useState("");

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setErrorMessage(""); // Reset error

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        setErrorMessage("Login gagal. Silakan coba lagi.");
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));

      // --- LOGIKA DETEKSI ERROR ---
      if (err.errors && err.errors.length > 0) {
        const errorCode = err.errors[0].code;
        if (errorCode === "form_identifier_not_found") {
          setErrorMessage(
            "Email belum terdaftar. Silakan daftar terlebih dahulu."
          );
        } else if (errorCode === "form_password_incorrect") {
          setErrorMessage("Email atau password salah.");
        } else {
          setErrorMessage(
            err.errors[0].message || "Terjadi kesalahan saat login."
          );
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Masuk Akun</Text>

      {/* Tampilkan Error Box jika ada error */}
      {errorMessage ? (
        <View
          style={{
            backgroundColor: "#ffebee",
            padding: 10,
            borderRadius: 8,
            marginBottom: 15,
          }}
        >
          <Text style={{ color: "#c62828", textAlign: "center" }}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <TextInput
        autoCapitalize="none"
        value={email}
        placeholder="Email"
        style={styles.input}
        onChangeText={(text) => {
          setEmail(text);
          setErrorMessage("");
        }}
      />
      <TextInput
        value={password}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        onChangeText={(text) => {
          setPassword(text);
          setErrorMessage("");
        }}
      />

      <Button title="Masuk (Sign In)" onPress={onSignInPress} />

      <View
        style={{
          marginTop: 20,
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <Text>Belum punya akun? </Text>
        <Link href="/(auth)/sign-up" asChild>
          <TouchableOpacity>
            <Text style={{ color: "blue", fontWeight: "bold" }}>
              Daftar di sini
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
