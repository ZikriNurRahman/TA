import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { addDeviceStyles as styles } from "@/styles/styles";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        "Gagal Daftar",
        err.errors ? err.errors[0].message : "Terjadi kesalahan"
      );
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Gagal Verifikasi", "Kode salah atau kadaluarsa.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {pendingVerification ? "Verifikasi Email" : "Daftar Akun Baru"}
      </Text>

      {!pendingVerification && (
        <>
          <TextInput
            autoCapitalize="none"
            value={email}
            placeholder="Email"
            style={styles.input}
            onChangeText={setEmail}
          />
          <TextInput
            value={password}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            onChangeText={setPassword}
          />
          <Button title="Daftar (Sign Up)" onPress={onSignUpPress} />

          <View
            style={{
              marginTop: 20,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Text>Sudah punya akun? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={{ color: "blue", fontWeight: "bold" }}>Masuk</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </>
      )}

      {pendingVerification && (
        <>
          <Text style={{ textAlign: "center", marginBottom: 20 }}>
            Kode dikirim ke {email}
          </Text>
          <TextInput
            value={code}
            placeholder="Kode OTP"
            style={styles.input}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          <Button title="Verifikasi Email" onPress={onPressVerify} />
        </>
      )}
    </SafeAreaView>
  );
}
