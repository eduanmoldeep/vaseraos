import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { listActiveSos, registerPushToken, type Guard, type SosAlert } from "../api";
import { registerAndroidPushToken } from "../push";
import { AlarmScreen } from "./AlarmScreen";

export function HomeScreen({ token, guard, onLogout }: { token: string; guard: Guard; onLogout: () => void }) {
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    registerAndroidPushToken().then((expoToken) => {
      if (expoToken) registerPushToken(token, "android", expoToken).catch(() => {});
    });
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      listActiveSos(token, guard.society_id)
        .then((rows) => {
          if (cancelled) return;
          setConnected(true);
          setAlert(rows.find((r) => r.status !== "resolved") ?? null);
        })
        .catch(() => { if (!cancelled) setConnected(false); });
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token, guard.society_id]);

  // A signed-out guard silently stops receiving alarms — always ask first.
  function confirmLogout() {
    Alert.alert("Sign out?", "You will NOT get SOS alarms until you sign in again.", [
      { text: "Stay signed in", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: onLogout },
    ]);
  }

  if (alert) {
    return <AlarmScreen token={token} alert={alert} onAcknowledged={() => setAlert(null)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <View style={[styles.dot, connected ? styles.dotOk : styles.dotWarn]} />
        <Text style={[styles.title, !connected && styles.titleWarn]} accessibilityRole="header">
          {connected ? "All clear" : "No connection"}
        </Text>
        <Text style={styles.subtitle}>{guard.name} · on duty</Text>
        <Text style={styles.hint}>
          {connected
            ? "Keep this app open. It will ring loudly the moment a resident presses SOS."
            : "Can't reach the server. Check mobile data or Wi-Fi — alarms can't arrive until it reconnects."}
        </Text>
      </View>
      <TouchableOpacity style={styles.logout} onPress={confirmLogout} accessibilityRole="button" accessibilityLabel="Sign out">
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 24, paddingTop: 64, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dot: { width: 28, height: 28, borderRadius: 14, marginBottom: 20 },
  dotOk: { backgroundColor: "#22c55e" },
  dotWarn: { backgroundColor: "#f59e0b" },
  title: { color: "#22c55e", fontSize: 44, fontWeight: "800" },
  titleWarn: { color: "#f59e0b" },
  subtitle: { color: "#fff", marginTop: 12, fontSize: 22, fontWeight: "600" },
  hint: { color: "#d4d4d8", marginTop: 28, textAlign: "center", fontSize: 19, lineHeight: 28, maxWidth: 340 },
  logout: { borderWidth: 2, borderColor: "#3f3f46", borderRadius: 16, minHeight: 60, alignItems: "center", justifyContent: "center" },
  logoutText: { color: "#d4d4d8", fontSize: 20, fontWeight: "700" },
});
