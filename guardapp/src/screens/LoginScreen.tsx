import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { loginGuard, type Guard } from "../api";

/** Big labelled fields (labels stay visible while typing) and plain instructions on where the details come from. */
export function LoginScreen({ onLoggedIn }: { onLoggedIn: (token: string, guard: Guard) => void }) {
  const [societyId, setSocietyId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!societyId.trim() || !phone.trim() || !password) {
      setError("Please fill in all three boxes.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token, guard } = await loginGuard(societyId.trim(), phone.trim(), password);
      onLoggedIn(token, guard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in. Check the details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          Guard sign in
        </Text>
        <Text style={styles.intro}>Your society committee gives you these details.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Society ID</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            value={societyId}
            onChangeText={setSocietyId}
            accessibilityLabel="Society ID"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Your phone number</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} accessibilityLabel="Your phone number" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              style={styles.showButton}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading} accessibilityRole="button" accessibilityLabel="Sign in">
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0a0a0a" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24, paddingTop: 64, paddingBottom: 48 },
  title: { fontSize: 32, fontWeight: "800", color: "#fff" },
  intro: { fontSize: 18, color: "#d4d4d8", marginTop: 8, marginBottom: 28, lineHeight: 26 },
  field: { marginBottom: 20 },
  label: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 8 },
  input: {
    backgroundColor: "#18181b",
    color: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#3f3f46",
    paddingHorizontal: 16,
    minHeight: 60,
    fontSize: 20,
  },
  passwordInput: { paddingRight: 96 },
  showButton: { position: "absolute", right: 6, top: 6, bottom: 6, minWidth: 80, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  showText: { color: "#a5b4fc", fontSize: 18, fontWeight: "700" },
  button: { backgroundColor: "#dc2626", borderRadius: 16, minHeight: 64, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 22 },
  error: { color: "#fca5a5", fontSize: 18, marginBottom: 16, lineHeight: 26 },
});
