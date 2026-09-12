import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

/**
 * Android push registration via Expo's push service — works once this app has
 * an EAS project id (added when EAS build is set up). Fails soft (returns
 * null) in Expo Go / before that's configured, so login still works without it.
 *
 * iOS doesn't go through here at all: Expo's push service can't deliver
 * VoIP/PushKit pushes, which is what real silent-bypass ringing needs. That's
 * wired separately once react-native-voip-push-notification + CallKit native
 * setup lands (needs an Expo prebuild/dev-client, not Expo Go).
 */
export async function registerAndroidPushToken(): Promise<string | null> {
  if (Platform.OS !== "android" || !Device.isDevice) return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return null;

    await Notifications.setNotificationChannelAsync("sos-alarm", {
      name: "SOS alarm",
      importance: Notifications.AndroidImportance.MAX,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: "default",
    });

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return data;
  } catch {
    return null;
  }
}
