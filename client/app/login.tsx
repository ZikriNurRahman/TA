import React from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";

export default function LoginScreen() {
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSignInPress = async () => {
    if (!isSignInLoaded) return;
    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });
      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onSignUpPress = async () => {
    if (!isSignUpLoaded) return;
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      // Anda bisa navigasi ke halaman verifikasi di sini
      alert("Periksa email Anda untuk kode verifikasi.");
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
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
      <Button title="Sign In" onPress={onSignInPress} />
      <TouchableOpacity onPress={onSignUpPress} style={{ marginTop: 20 }}>
        <Text style={{ textAlign: "center", color: "blue" }}>
          Tidak punya akun? Daftar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
});
