import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { listActiveSos, registerPushToken, type Guard, type SosAlert } from "../api";
import { registerAndroidPushToken } from "../push";
import { AlarmScreen } from "./AlarmScreen";

export function HomeScreen({ token, guard, onLogout }: { token: string; guard: Guard; onLogout: () => void }) {
  const [alert, setAlert] = useState<SosAlert | null>(null);

  useEffect(() => {
    registerAndroidPushToken().then((expoToken) => {
      if (expoToken) registerPushToken(token, "android", expoToken).catch(() => {});
    });
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      listActiveSos(token, guard.society_id)
        .then((rows) => { if (!cancelled) setAlert(rows.find((r) => r.status !== "resolved") ?? null); })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token, guard.society_id]);

  if (alert) {
    return <AlarmScreen token={token} alert={alert} onAcknowledged={() => setAlert(null)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All clear</Text>
      <Text style={styles.subtitle}>{guard.name} · on duty</Text>
      <Text style={styles.hint}>You'll be alerted here the moment a resident raises an SOS.</Text>
      <TouchableOpacity style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a", padding: 24 },
  title: { color: "#22c55e", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#fff", marginTop: 8, fontSize: 16 },
  hint: { color: "#71717a", marginTop: 24, textAlign: "center" },
  logout: { position: "absolute", bottom: 48 },
  logoutText: { color: "#71717a", fontSize: 14 },
});
