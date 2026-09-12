import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Guard } from "./src/api";
import { clearSession, loadSession, saveSession } from "./src/session";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";

export default function App() {
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<{ token: string; guard: Guard } | null>(null);

  useEffect(() => {
    loadSession().then(setSession).finally(() => setChecked(true));
  }, []);

  if (!checked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <LoginScreen onLoggedIn={(token, guard) => { saveSession(token, guard); setSession({ token, guard }); }} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <HomeScreen token={session.token} guard={session.guard} onLogout={() => { clearSession(); setSession(null); }} />
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
});
