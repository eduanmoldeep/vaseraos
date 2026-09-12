import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { loginGuard, type Guard } from "../api";

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (token: string, guard: Guard) => void }) {
  const [societyId, setSocietyId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const { token, guard } = await loginGuard(societyId.trim(), phone.trim(), password);
      onLoggedIn(token, guard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Guard sign in</Text>
      <TextInput style={styles.input} placeholder="Society ID" autoCapitalize="none" value={societyId} onChangeText={setSocietyId} />
      <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0a0a0a" },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 24 },
  input: { backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: "#dc2626", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: "#f87171", marginBottom: 12 },
});
