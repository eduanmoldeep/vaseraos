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

  useEffect(() => {
    player.loop = true;
    player.play();
    return () => player.pause();
  }, [player]);

  async function acknowledge() {
    setAcking(true);
    try {
      await acknowledgeSos(token, alert.id);
      onAcknowledged();
    } finally {
      setAcking(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>SOS ALARM</Text>
      <Text style={styles.flat}>Flat {alert.flat}</Text>
      <TouchableOpacity style={styles.button} onPress={acknowledge} disabled={acking}>
        {acking ? <ActivityIndicator color="#dc2626" /> : <Text style={styles.buttonText}>Acknowledge</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#dc2626", padding: 24 },
  kicker: { color: "#fff", fontWeight: "800", letterSpacing: 2, fontSize: 14, marginBottom: 8 },
  flat: { color: "#fff", fontWeight: "800", fontSize: 40, marginBottom: 48 },
  button: { backgroundColor: "#fff", borderRadius: 999, paddingVertical: 18, paddingHorizontal: 48 },
  buttonText: { color: "#dc2626", fontWeight: "800", fontSize: 18 },
});
