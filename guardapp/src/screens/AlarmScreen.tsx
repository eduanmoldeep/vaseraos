import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { acknowledgeSos, type SosAlert } from "../api";

const siren = require("../../assets/siren.wav");

/**
 * Full-screen alarm — currently a foreground-only siren + acknowledge button.
 * The real "rings through silent mode / wakes a locked phone" behavior needs
 * a dev build with notifee (Android full-screen intent + bypassDnd channel)
 * and CallKit/VoIP (iOS) — that's the next native-module phase, not doable in
 * Expo Go. This screen is what those will eventually launch into.
 */
export function AlarmScreen({ token, alert, onAcknowledged }: { token: string; alert: SosAlert; onAcknowledged: () => void }) {
  const player = useAudioPlayer(siren);
  const [acking, setAcking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    player.loop = true;
    player.play();
    return () => player.pause();
  }, [player]);

  async function acknowledge() {
    setAcking(true);
    setError("");
    try {
      await acknowledgeSos(token, alert.id);
      onAcknowledged();
    } catch {
      setError("Couldn't send — tap again. Go to the flat anyway.");
    } finally {
      setAcking(false);
    }
  }

  return (
    <View style={styles.container} accessibilityLiveRegion="assertive">
      <View style={styles.center}>
        <Text style={styles.kicker}>SOS — RESIDENT NEEDS HELP</Text>
        <Text style={styles.flatLabel}>Go to flat</Text>
        <Text style={styles.flat} adjustsFontSizeToFit numberOfLines={1}>
          {alert.flat}
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={styles.button}
        onPress={acknowledge}
        disabled={acking}
        accessibilityRole="button"
        accessibilityLabel={`I'm going to flat ${alert.flat}. Stop the alarm.`}
      >
        {acking ? (
          <ActivityIndicator color="#dc2626" size="large" />
        ) : (
          <>
            <Text style={styles.buttonText}>{"I'm going"}</Text>
            <Text style={styles.buttonSub}>Stops the alarm and tells the resident</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#dc2626", padding: 24, paddingTop: 72, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  kicker: { color: "#fff", fontWeight: "800", letterSpacing: 1.5, fontSize: 18, textAlign: "center" },
  flatLabel: { color: "#fee2e2", fontSize: 24, fontWeight: "600", marginTop: 32 },
  flat: { color: "#fff", fontWeight: "900", fontSize: 88, marginTop: 4 },
  error: { color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  button: { backgroundColor: "#fff", borderRadius: 24, minHeight: 104, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  buttonText: { color: "#dc2626", fontWeight: "900", fontSize: 32 },
  buttonSub: { color: "#7f1d1d", fontSize: 16, fontWeight: "600", marginTop: 4 },
});
