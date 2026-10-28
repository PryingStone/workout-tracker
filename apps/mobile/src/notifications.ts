import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const key = 'pulse-notification-ids';
export async function clearNotifications() {
  if (Platform.OS === 'web') return;
  const N = await import('expo-notifications');
  const ids = JSON.parse((await AsyncStorage.getItem(key)) || '[]') as string[];
  await Promise.all(ids.map((id) => N.cancelScheduledNotificationAsync(id)));
  await AsyncStorage.removeItem(key);
}
export async function configureNotifications(
  reminders: any[],
  schedules: any[],
  request = false,
) {
  if (Platform.OS === 'web') {
    if (request)
      throw new Error(
        'Local notifications require the iOS or Android app on a supported device.',
      );
    return false;
  }
  const N = await import('expo-notifications');
  if (Platform.OS === 'android')
    await N.setNotificationChannelAsync('workouts', {
      name: 'Workout reminders',
      importance: N.AndroidImportance.DEFAULT,
    });
  let permission = await N.getPermissionsAsync();
  if (!permission.granted && request)
    permission = await N.requestPermissionsAsync();
  if (!permission.granted) {
    if (request)
      throw new Error(
        'Notifications are disabled. Enable them in device settings to receive reminders.',
      );
    return false;
  }
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  await clearNotifications();
  const ids: string[] = [];
  try {
    for (const r of reminders.filter((r) => r.enabled))
      ids.push(
        await N.scheduleNotificationAsync({
          content: {
            title: r.title,
            body: 'Make a little time for yourself today.',
          },
          trigger: {
            type: N.SchedulableTriggerInputTypes.DAILY,
            hour: r.hour,
            minute: r.minute,
            channelId: 'workouts',
          },
        }),
      );
    for (const s of schedules
      .filter(
        (s) => s.status === 'scheduled' && new Date(s.scheduledAt) > new Date(),
      )
      .slice(0, 40))
      ids.push(
        await N.scheduleNotificationAsync({
          content: {
            title: s.name,
            body: 'Your scheduled workout is ready. Let’s get moving.',
          },
          trigger: {
            type: N.SchedulableTriggerInputTypes.DATE,
            date: new Date(s.scheduledAt),
            channelId: 'workouts',
          },
        }),
      );
  } finally {
    await AsyncStorage.setItem(key, JSON.stringify(ids));
  }
  return true;
}
export async function goalNotification(
  user: string,
  date: string,
  goals: any[],
) {
  if (Platform.OS === 'web' || !goals.some((g) => g.percent >= 100)) return;
  const N = await import('expo-notifications');
  if (!(await N.getPermissionsAsync()).granted) return;
  const k = `pulse-goal-${user}-${date}`;
  if (await AsyncStorage.getItem(k)) return;
  await N.scheduleNotificationAsync({
    content: {
      title: 'Goal achieved ✨',
      body: 'You reached a fitness goal. Take a moment to celebrate.',
    },
    trigger: null,
  });
  await AsyncStorage.setItem(k, 'sent');
}
