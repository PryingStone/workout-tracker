import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { api, localDay, restoreToken, saveToken } from './src/api';
import {
  clearNotifications,
  configureNotifications,
  goalNotification,
} from './src/notifications';
import {
  Button,
  Card,
  Chart,
  C,
  Empty,
  Field,
  FormModal,
  Icon,
  Label,
  Ring,
  s,
} from './src/ui';

type Tab = 'Home' | 'Workouts' | 'Progress' | 'Profile';
type Form = {
  title: string;
  fields: Field[];
  submit: (values: Record<string, string>) => Promise<void>;
};
const fmt = (n: number) => new Intl.NumberFormat().format(n);
const exerciseFields: Field[] = [
  { key: 'name', label: 'Exercise name' },
  { key: 'sets', label: 'Sets', type: 'number', initial: '3' },
  { key: 'reps', label: 'Repetitions', type: 'number', initial: '10' },
  { key: 'weightKg', label: 'Weight (kg)', type: 'number', initial: '0' },
  {
    key: 'durationMinutes',
    label: 'Duration (minutes)',
    type: 'number',
    initial: '0',
  },
];
function Auth({ onLogin }: { onLogin: (u: any) => void }) {
  const [register, setRegister] = useState(false),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <SafeAreaView style={s.page}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: 430, gap: 28 }}>
          <View style={s.row}>
            <View
              style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
            >
              <Icon name="pulse" size={35} color={C.green} />
              <Text
                style={{
                  color: C.text,
                  fontSize: 29,
                  fontWeight: '800',
                  letterSpacing: -1,
                }}
              >
                pulse<Text style={{ color: C.green }}>.</Text>
              </Text>
            </View>
            <Text style={s.muted}>MOVE WITH INTENTION</Text>
          </View>
          <View>
            <Text style={[s.h1, { fontSize: 42, lineHeight: 48 }]}>
              A little stronger.{'\n'}Every day.
            </Text>
            <Text style={[s.muted, { marginTop: 14, fontSize: 15 }]}>
              Your movement, your milestones, your pace. Make room for a
              healthier you.
            </Text>
          </View>
          <Card>
            <Text style={s.h2}>
              {register ? 'Start your journey' : 'Welcome back'}
            </Text>
            {register && (
              <View>
                <Label>Your name</Label>
                <TextInput
                  accessibilityLabel="Your name"
                  value={name}
                  onChangeText={setName}
                  style={s.input}
                  autoComplete="name"
                />
              </View>
            )}
            <View>
              <Label>Email address</Label>
              <TextInput
                accessibilityLabel="Email address"
                value={email}
                onChangeText={setEmail}
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
            <View>
              <Label>Password · at least 10 characters</Label>
              <TextInput
                accessibilityLabel="Password"
                value={password}
                onChangeText={setPassword}
                style={s.input}
                secureTextEntry
                autoComplete={register ? 'new-password' : 'current-password'}
              />
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={{ color: C.red }}>
                {error}
              </Text>
            ) : null}
            <Button
              disabled={busy}
              title={
                busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'
              }
              onPress={async () => {
                setBusy(true);
                setError('');
                try {
                  const result = await api(
                    '/auth/' + (register ? 'register' : 'login'),
                    'POST',
                    {
                      ...(register ? { name } : {}),
                      email: email.trim().toLowerCase(),
                      password,
                    },
                  );
                  await saveToken(result.token);
                  onLogin(result.user);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'Unable to sign in',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRegister(!register);
                setError('');
              }}
            >
              <Text style={{ color: C.green, textAlign: 'center', padding: 8 }}>
                {register
                  ? 'Already have an account? Sign in'
                  : 'New here? Create an account'}
              </Text>
            </Pressable>
          </Card>
          <Text style={[s.muted, { textAlign: 'center', fontSize: 11 }]}>
            A personal fitness journal. Estimates are for general wellness,
            {'\n'}not medical advice. Your records stay private to your account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
export default function App() {
  const { width } = useWindowDimensions(),
    wide = width > 850;
  const [user, setUser] = useState<any>(null),
    [boot, setBoot] = useState(true),
    [tab, setTab] = useState<Tab>('Home'),
    [data, setData] = useState<any>(null),
    [workouts, setWorkouts] = useState<any[]>([]),
    [records, setRecords] = useState<any[]>([]),
    [goals, setGoals] = useState<any[]>([]),
    [schedules, setSchedules] = useState<any[]>([]),
    [reminders, setReminders] = useState<any[]>([]),
    [exercises, setExercises] = useState<any[]>([]),
    [integrations, setIntegrations] = useState<any[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [form, setForm] = useState<Form | null>(null),
    [deletion, setDeletion] = useState<{ path: string; name: string } | null>(
      null,
    ),
    [deleteBusy, setDeleteBusy] = useState(false),
    [period, setPeriod] = useState('weekly'),
    [metric, setMetric] = useState('steps');
  useEffect(() => {
    (async () => {
      try {
        if (await restoreToken()) setUser(await api('/profile'));
      } catch {
        await saveToken(null);
      } finally {
        setBoot(false);
      }
    })();
  }, []);
  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [d, w, r, g, sc, re, ex, ins] = await Promise.all([
        api(`/dashboard?date=${localDay()}&period=${period}`),
        api('/workouts'),
        api('/records'),
        api('/goals'),
        api('/schedules'),
        api('/reminders'),
        api('/exercises'),
        api('/integrations'),
      ]);
      setData(d);
      setWorkouts(w);
      setRecords(r);
      setGoals(g);
      setSchedules(sc);
      setReminders(re);
      setExercises(ex);
      setIntegrations(ins);
      try {
        await configureNotifications(re, sc);
        await goalNotification(user._id, localDay(), d.goals);
      } catch (e) {
        setNotice(
          'Data saved; device reminders could not be refreshed. Enable notifications in Profile.',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your data');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user) void refresh();
  }, [user, period]);
  async function mutate(path: string, method: string, body?: any) {
    await api(path, method, body);
    setNotice('Changes saved');
    await refresh();
  }
  function openWorkout(w?: any) {
    setForm({
      title: w ? 'Edit workout' : 'Log a workout',
      fields: [
        { key: 'name', label: 'Workout name', initial: w?.name },
        {
          key: 'type',
          label: 'Activity',
          initial: w?.type || 'strength',
          choices: [
            'strength',
            'running',
            'walking',
            'cycling',
            'yoga',
            'other',
          ],
        },
        {
          key: 'date',
          label: 'Date (YYYY-MM-DD)',
          initial: w?.date || localDay(),
        },
        {
          key: 'durationMinutes',
          label: 'Duration (minutes)',
          type: 'number',
          initial: String(w?.durationMinutes || 30),
        },
        {
          key: 'notes',
          label: 'Notes',
          type: 'multiline',
          optional: true,
          initial: w?.notes,
        },
      ],
      submit: async (v) => {
        if (v.date > localDay())
          throw new Error('Use the schedule to plan future workouts.');
        await mutate('/workouts' + (w ? '/' + w._id : ''), w ? 'PUT' : 'POST', {
          ...v,
          durationMinutes: Number(v.durationMinutes),
          exercises: (w?.exercises || []).map(
            ({ name, sets, reps, weightKg, durationMinutes }: any) => ({
              name,
              sets,
              reps,
              weightKg,
              durationMinutes,
            }),
          ),
        });
      },
    });
  }
  function openRecord(r?: any) {
    setForm({
      title: r ? 'Edit daily measurements' : 'Daily check-in',
      fields: [
        {
          key: 'date',
          label: 'Date (YYYY-MM-DD)',
          initial: r?.date || localDay(),
        },
        {
          key: 'steps',
          label: 'Total steps for this day',
          type: 'number',
          optional: true,
          initial: r?.steps !== undefined ? String(r.steps) : '',
        },
        {
          key: 'weightKg',
          label: 'Weight (kg)',
          type: 'number',
          optional: true,
          initial: r?.weightKg !== undefined ? String(r.weightKg) : '',
        },
        {
          key: 'heartRateBpm',
          label: 'Measured heart rate (bpm)',
          type: 'number',
          optional: true,
          initial: r?.heartRateBpm !== undefined ? String(r.heartRateBpm) : '',
        },
      ],
      submit: async (v) => {
        if (v.date > localDay())
          throw new Error('Measurements cannot be in the future.');
        const body: any = { date: v.date };
        for (const key of ['steps', 'weightKg', 'heartRateBpm'])
          if (v[key].trim()) body[key] = Number(v[key]);
        await mutate('/records', 'PUT', body);
      },
    });
  }
  function openGoal(g?: any) {
    setForm({
      title: g ? 'Edit fitness goal' : 'Set a fitness goal',
      fields: [
        {
          key: 'metric',
          label: 'Measure',
          choices: ['steps', 'duration', 'workouts'],
          initial: g?.metric || 'steps',
        },
        {
          key: 'period',
          label: 'Goal period',
          choices: ['daily', 'weekly'],
          initial: g?.period || 'daily',
        },
        {
          key: 'target',
          label: 'Target (steps, minutes or sessions)',
          type: 'number',
          initial: String(g?.target || 8000),
        },
      ],
      submit: async (v) =>
        mutate('/goals' + (g ? '/' + g._id : ''), g ? 'PUT' : 'POST', {
          ...v,
          target: Number(v.target),
        }),
    });
  }
  function openSchedule(sc?: any) {
    const next = new Date(Date.now() + 86400000);
    setForm({
      title: sc ? 'Edit scheduled workout' : 'Plan your next session',
      fields: [
        { key: 'name', label: 'Workout name', initial: sc?.name },
        {
          key: 'date',
          label: 'Date (YYYY-MM-DD)',
          initial: sc ? localDay(new Date(sc.scheduledAt)) : localDay(next),
        },
        {
          key: 'time',
          label: 'Local time (HH:MM, 24 hour)',
          initial: sc
            ? `${String(new Date(sc.scheduledAt).getHours()).padStart(2, '0')}:${String(new Date(sc.scheduledAt).getMinutes()).padStart(2, '0')}`
            : '18:00',
        },
        {
          key: 'status',
          label: 'Status',
          choices: ['scheduled', 'completed', 'missed'],
          initial: sc?.status || 'scheduled',
        },
      ],
      submit: async (v) => {
        if (
          !/^\d{2}:\d{2}$/.test(v.time) ||
          Number(v.time.slice(0, 2)) > 23 ||
          Number(v.time.slice(3)) > 59
        )
          throw new Error('Use a valid 24-hour time');
        const d = new Date(v.date + 'T' + v.time + ':00');
        if (isNaN(d.getTime()) || localDay(d) !== v.date)
          throw new Error('Use a valid date');
        if (v.status === 'scheduled' && d <= new Date())
          throw new Error('Choose a future time for a scheduled workout');
        await mutate(
          '/schedules' + (sc ? '/' + sc._id : ''),
          sc ? 'PUT' : 'POST',
          { name: v.name, scheduledAt: d.toISOString(), status: v.status },
        );
      },
    });
  }
  function openReminder(r?: any) {
    setForm({
      title: r ? 'Edit reminder' : 'Create daily reminder',
      fields: [
        {
          key: 'title',
          label: 'Reminder title',
          initial: r?.title || 'Time to move',
        },
        {
          key: 'time',
          label: 'Device local time (HH:MM)',
          initial: r
            ? `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`
            : '18:00',
        },
        {
          key: 'enabled',
          label: 'Reminder status',
          choices: ['enabled', 'disabled'],
          initial: r?.enabled === false ? 'disabled' : 'enabled',
        },
      ],
      submit: async (v) => {
        if (!/^\d{2}:\d{2}$/.test(v.time)) throw new Error('Use HH:MM');
        await mutate(
          '/reminders' + (r ? '/' + r._id : ''),
          r ? 'PUT' : 'POST',
          {
            title: v.title,
            hour: Number(v.time.slice(0, 2)),
            minute: Number(v.time.slice(3)),
            enabled: v.enabled === 'enabled',
          },
        );
      },
    });
  }
  function openExercise(w: any, e?: any, index?: number) {
    setForm({
      title: e ? 'Edit exercise' : 'Add exercise to ' + w.name,
      fields: exerciseFields.map((f) => ({
        ...f,
        initial: e ? String(e[f.key]) : f.initial,
      })),
      submit: async (v) => {
        const ex = {
          name: v.name,
          sets: Number(v.sets),
          reps: Number(v.reps),
          weightKg: Number(v.weightKg),
          durationMinutes: Number(v.durationMinutes),
        };
        const list = [...w.exercises];
        if (index === undefined) list.push(ex);
        else list[index] = ex;
        await mutate('/workouts/' + w._id, 'PUT', {
          name: w.name,
          type: w.type,
          date: w.date,
          durationMinutes: w.durationMinutes,
          notes: w.notes,
          exercises: list.map(
            ({ name, sets, reps, weightKg, durationMinutes }: any) => ({
              name,
              sets,
              reps,
              weightKg,
              durationMinutes,
            }),
          ),
        });
      },
    });
  }
  function openLibrary(e?: any) {
    setForm({
      title: e ? 'Edit saved exercise' : 'Save exercise template',
      fields: exerciseFields.map((f) => ({
        ...f,
        initial: e ? String(e[f.key]) : f.initial,
      })),
      submit: async (v) =>
        mutate('/exercises' + (e ? '/' + e._id : ''), e ? 'PUT' : 'POST', {
          name: v.name,
          sets: Number(v.sets),
          reps: Number(v.reps),
          weightKg: Number(v.weightKg),
          durationMinutes: Number(v.durationMinutes),
        }),
    });
  }
  const actions = (path: string, item: any, edit: () => void) => (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <Pressable
        accessibilityLabel={`Edit ${item.name || item.title || 'item'}`}
        onPress={edit}
      >
        <Icon name="create-outline" size={20} />
      </Pressable>
      <Pressable
        accessibilityLabel={`Delete ${item.name || item.title || 'item'}`}
        onPress={() =>
          setDeletion({
            path: path + '/' + item._id,
            name: item.name || item.title || 'this record',
          })
        }
      >
        <Icon name="trash-outline" size={19} />
      </Pressable>
    </View>
  );
  const sectionTitle = (title: string, subtitle?: string) => (
    <View style={{ gap: 5, flex: 1, minWidth: 0 }}>
      <Text style={s.h2}>{title}</Text>
      {subtitle && <Text style={s.muted}>{subtitle}</Text>}
    </View>
  );
  const scheduleList = (items: any[]) =>
    items.length ? (
      items.map((sc) => (
        <View
          key={sc._id}
          style={[
            s.row,
            { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 },
          ]}
        >
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: C.text, fontWeight: '600' }}>{sc.name}</Text>
            <Text style={s.muted}>
              {new Date(sc.scheduledAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ·{' '}
              <Text
                style={{
                  color:
                    sc.status === 'completed'
                      ? C.green
                      : sc.status === 'missed'
                        ? C.orange
                        : C.teal,
                }}
              >
                {sc.status}
              </Text>
            </Text>
            {sc.status !== 'completed' && (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  void mutate('/schedules/' + sc._id, 'PUT', {
                    name: sc.name,
                    scheduledAt: sc.scheduledAt,
                    status: 'completed',
                  }).catch((e) => setError(e.message))
                }
              >
                <Text
                  style={{ color: C.green, fontSize: 12, paddingVertical: 7 }}
                >
                  Mark completed (log details separately)
                </Text>
              </Pressable>
            )}
          </View>
          {actions('/schedules', sc, () => openSchedule(sc))}
        </View>
      ))
    ) : (
      <Empty
        title="Make time for movement"
        description="Schedule a session and give your next workout a place in your day."
      />
    );
  if (boot)
    return (
      <View style={[s.page, { justifyContent: 'center' }]}>
        <ActivityIndicator color={C.green} />
      </View>
    );
  if (!user)
    return (
      <>
        <StatusBar style="light" />
        <Auth onLogin={setUser} />
      </>
    );
  const today = data?.today,
    stepGoal = goals.find((g) => g.metric === 'steps' && g.period === 'daily'),
    stepPercent =
      stepGoal && today
        ? Math.min(100, Math.round((today.steps / stepGoal.target) * 100))
        : 0;
  return (
    <SafeAreaView style={s.page}>
      <StatusBar style="light" />
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {wide && (
          <View
            style={{
              width: 210,
              borderRightWidth: 1,
              borderColor: C.border,
              padding: 24,
              gap: 35,
            }}
          >
            <View
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              <Icon name="pulse" color={C.green} size={30} />
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 28 }}>
                pulse<Text style={{ color: C.green }}>.</Text>
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {(['Home', 'Workouts', 'Progress', 'Profile'] as Tab[]).map(
                (t, i) => (
                  <Pressable
                    key={t}
                    accessibilityRole="tab"
                    accessibilityLabel={t}
                    accessibilityState={{ selected: tab === t }}
                    onPress={() => setTab(t)}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: tab === t ? C.panel : 'transparent',
                      flexDirection: 'row',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Icon
                      name={
                        [
                          'grid-outline',
                          'barbell-outline',
                          'stats-chart-outline',
                          'person-outline',
                        ][i]
                      }
                      color={tab === t ? C.green : C.muted}
                    />
                    <Text
                      style={{
                        color: tab === t ? C.green : C.muted,
                        fontWeight: '600',
                      }}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            <View style={{ flex: 1 }} />
            <Card style={{ padding: 14 }}>
              <Icon name="sparkles-outline" color={C.green} />
              <Text style={{ color: C.text, lineHeight: 22 }}>
                Progress starts with showing up.
              </Text>
              <Text style={s.muted}>One day at a time.</Text>
            </Card>
            <Text style={s.muted}>
              {user.name}
              {'\n'}Personal workspace
            </Text>
          </View>
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={C.green}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.row}>
            <View>
              <Text style={[s.label, { letterSpacing: 2, color: C.green }]}>
                YOUR EVERYDAY EDGE
              </Text>
              <Text style={s.h1}>
                {tab === 'Home'
                  ? `Hey, ${user.name.split(' ')[0]} 👋`
                  : tab === 'Workouts'
                    ? 'Make your move'
                    : tab === 'Progress'
                      ? 'See how far you’ve come'
                      : 'Your space'}
              </Text>
              <Text style={[s.muted, { marginTop: 6 }]}>
                {tab === 'Home'
                  ? new Date().toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                  : tab === 'Workouts'
                    ? 'Build a routine that feels like you.'
                    : tab === 'Progress'
                      ? 'Small steps. Meaningful progress.'
                      : 'A healthier routine, on your terms.'}
              </Text>
            </View>
            {wide && (
              <View
                style={{
                  backgroundColor: C.panel,
                  padding: 14,
                  borderRadius: 50,
                }}
              >
                <Icon name="fitness-outline" color={C.green} />
              </View>
            )}
          </View>
          {error ? (
            <Card style={{ borderColor: C.red }}>
              <Text accessibilityRole="alert" style={{ color: C.red }}>
                {error}
              </Text>
              <Button
                title="Try again"
                secondary
                onPress={() => void refresh()}
              />
              <Button
                title="Return to sign in"
                secondary
                onPress={() => void saveToken(null).then(() => setUser(null))}
              />
            </Card>
          ) : null}
          {notice ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss status message"
              onPress={() => setNotice('')}
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: C.border,
              }}
            >
              <Text style={{ color: C.green }}>{notice} ×</Text>
            </Pressable>
          ) : null}
          {loading && !data ? <ActivityIndicator color={C.green} /> : null}
          {tab === 'Home' && (
            <>
              <View style={[s.wrap, { alignItems: 'stretch' }]}>
                <Card
                  style={{
                    flex: wide ? 1.6 : 1,
                    minWidth: 250,
                    backgroundColor: '#202B1C',
                  }}
                >
                  <View style={s.row}>
                    <View>
                      <Text
                        style={[
                          s.label,
                          { letterSpacing: 1.5, color: C.green },
                        ]}
                      >
                        TODAY’S ACTIVITY
                      </Text>
                      <Text style={[s.h2, { fontSize: 26 }]}>
                        Every step counts.
                      </Text>
                      <Text style={[s.muted, { marginTop: 8 }]}>
                        Keep moving toward your daily goal.
                      </Text>
                    </View>
                    <Icon name="footsteps-outline" color={C.green} size={30} />
                  </View>
                  <View style={s.row}>
                    <View style={{ gap: 4 }}>
                      <Text
                        style={{
                          color: C.text,
                          fontSize: 42,
                          fontWeight: '700',
                          letterSpacing: -2,
                        }}
                      >
                        {fmt(today?.steps || 0)}
                      </Text>
                      <Text style={s.muted}>
                        {stepGoal
                          ? `of ${fmt(stepGoal.target)} steps`
                          : 'Set a daily step goal in Profile'}
                      </Text>
                      <Text
                        style={{ color: C.green, fontSize: 11, marginTop: 8 }}
                      >
                        MANUALLY RECORDED
                      </Text>
                    </View>
                    <Ring percent={stepPercent} />
                  </View>
                  <Button
                    title="Daily check-in"
                    icon="add"
                    onPress={() =>
                      openRecord(records.find((r) => r.date === localDay()))
                    }
                  />
                </Card>
                <View style={{ flex: 1, minWidth: 230, gap: 14 }}>
                  {[
                    {
                      label: 'Active minutes',
                      value: today?.duration || 0,
                      unit: 'min',
                      icon: 'timer-outline',
                      color: C.teal,
                    },
                    {
                      label: 'Calories burned',
                      value: today?.caloriesEstimate || 0,
                      unit: 'kcal · estimate',
                      icon: 'flame-outline',
                      color: C.orange,
                    },
                    {
                      label: 'Heart rate',
                      value: today?.heartRateBpm ?? '—',
                      unit: today?.heartRateBpm
                        ? 'bpm · manually entered'
                        : 'No measurement today',
                      icon: 'heart-outline',
                      color: '#E9A2B1',
                    },
                  ].map((x) => (
                    <Card key={x.label} style={{ flex: 1, padding: 18 }}>
                      <View style={s.row}>
                        <View>
                          <Text style={s.muted}>{x.label}</Text>
                          <Text
                            style={{
                              color: C.text,
                              fontSize: 25,
                              fontWeight: '600',
                              marginTop: 6,
                            }}
                          >
                            {x.value}{' '}
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '400',
                                color: C.muted,
                              }}
                            >
                              {x.unit}
                            </Text>
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: C.bg,
                            padding: 12,
                            borderRadius: 14,
                          }}
                        >
                          <Icon name={x.icon} color={x.color} />
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
              <View style={s.wrap}>
                <Card style={{ flex: 1, minWidth: 260 }}>
                  <View style={s.row}>
                    {sectionTitle(
                      'Your activity rhythm',
                      'Steps over the selected period',
                    )}
                    <Pressable
                      onPress={() => setTab('Progress')}
                      accessibilityRole="button"
                    >
                      <Icon name="arrow-forward" color={C.green} />
                    </Pressable>
                  </View>
                  {data?.hasData ? (
                    <Chart series={data.series} metric="steps" />
                  ) : (
                    <Empty
                      title="Your story starts here"
                      description="Add your first measurement or workout to begin seeing your activity."
                    />
                  )}
                </Card>
                <Card style={{ flex: 1, minWidth: 260 }}>
                  <View style={s.row}>
                    {sectionTitle('Up next', 'Make a little time for yourself')}
                    <Pressable
                      accessibilityLabel="Schedule workout"
                      onPress={() => openSchedule()}
                    >
                      <Icon name="add-circle-outline" color={C.green} />
                    </Pressable>
                  </View>
                  {scheduleList(
                    schedules
                      .filter((sc) => sc.status === 'scheduled')
                      .sort((a, b) =>
                        a.scheduledAt.localeCompare(b.scheduledAt),
                      )
                      .slice(0, 3),
                  )}
                </Card>
              </View>
              <Card>
                <View style={s.row}>
                  {sectionTitle(
                    'Recent sessions',
                    'A little effort goes a long way',
                  )}
                  <Button
                    title="Log workout"
                    icon="add"
                    onPress={() => openWorkout()}
                  />
                </View>
                {workouts.length ? (
                  workouts.slice(0, 3).map((w) => (
                    <View
                      style={[
                        s.row,
                        {
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderColor: C.border,
                        },
                      ]}
                      key={w._id}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 14,
                          flex: 1,
                        }}
                      >
                        <Icon name="barbell-outline" color={C.green} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontWeight: '600' }}>
                            {w.name}
                          </Text>
                          <Text style={s.muted}>
                            {w.date} · {w.type}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: C.text }}>
                        {w.durationMinutes} min
                      </Text>
                    </View>
                  ))
                ) : (
                  <Empty
                    title="Your first session awaits"
                    description="A walk, a lift, a stretch. Log whatever moves you."
                  />
                )}
              </Card>
              <Text style={[s.muted, { fontSize: 11 }]}>
                Calories use activity intensity and your recorded weight, or a
                70 kg fallback. These estimates are not medical measurements. No
                automatic sensor or health account is connected.
              </Text>
            </>
          )}
          {tab === 'Workouts' && (
            <>
              <View style={s.wrap}>
                <Button
                  title="Log workout"
                  icon="add"
                  onPress={() => openWorkout()}
                />
                <Button
                  title="Schedule session"
                  secondary
                  icon="calendar-outline"
                  onPress={() => openSchedule()}
                />
              </View>
              <Card>
                {sectionTitle(
                  'Workout journal',
                  `${workouts.length} recorded sessions`,
                )}
                {!workouts.length && (
                  <Empty
                    title="Find your rhythm"
                    description="Log a workout, then add exercises with sets, reps, weight and duration."
                  />
                )}
                {workouts.map((w) => (
                  <View
                    key={w._id}
                    style={{
                      borderTopWidth: 1,
                      borderColor: C.border,
                      paddingTop: 20,
                      gap: 13,
                    }}
                  >
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.h2}>{w.name}</Text>
                        <Text style={s.muted}>
                          {w.date} · {w.type} · {w.durationMinutes} min · ~
                          {w.caloriesEstimate} kcal
                        </Text>
                      </View>
                      {actions('/workouts', w, () => openWorkout(w))}
                    </View>
                    {w.notes ? <Text style={s.muted}>{w.notes}</Text> : null}
                    {w.exercises.map((e: any, i: number) => (
                      <View key={i} style={s.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text }}>{e.name}</Text>
                          <Text style={s.muted}>
                            {e.sets} sets × {e.reps} reps · {e.weightKg} kg ·{' '}
                            {e.durationMinutes} min
                          </Text>
                        </View>
                        <Pressable
                          accessibilityLabel={`Edit exercise ${e.name}`}
                          onPress={() => openExercise(w, e, i)}
                        >
                          <Icon name="create-outline" />
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Remove exercise ${e.name}`}
                          onPress={() => {
                            const list = w.exercises
                              .filter((_: any, j: number) => j !== i)
                              .map(
                                ({
                                  name,
                                  sets,
                                  reps,
                                  weightKg,
                                  durationMinutes,
                                }: any) => ({
                                  name,
                                  sets,
                                  reps,
                                  weightKg,
                                  durationMinutes,
                                }),
                              );
                            void mutate('/workouts/' + w._id, 'PUT', {
                              name: w.name,
                              type: w.type,
                              date: w.date,
                              durationMinutes: w.durationMinutes,
                              notes: w.notes,
                              exercises: list,
                            }).catch((e) => setError(e.message));
                          }}
                        >
                          <Icon name="close-circle-outline" />
                        </Pressable>
                      </View>
                    ))}
                    <View style={s.wrap}>
                      <Button
                        title="Add exercise"
                        secondary
                        onPress={() => openExercise(w)}
                      />
                      {exercises.slice(0, 5).map((e) => (
                        <Button
                          key={e._id}
                          secondary
                          title={`+ ${e.name}`}
                          onPress={() => {
                            const clean = ({
                              name,
                              sets,
                              reps,
                              weightKg,
                              durationMinutes,
                            }: any) => ({
                              name,
                              sets,
                              reps,
                              weightKg,
                              durationMinutes,
                            });
                            void mutate('/workouts/' + w._id, 'PUT', {
                              name: w.name,
                              type: w.type,
                              date: w.date,
                              durationMinutes: w.durationMinutes,
                              notes: w.notes,
                              exercises: [...w.exercises.map(clean), clean(e)],
                            }).catch((e) => setError(e.message));
                          }}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </Card>
              <Card>
                <View style={s.row}>
                  {sectionTitle(
                    'Your schedule',
                    'Past uncompleted sessions appear as missed',
                  )}
                  <Button
                    title="Plan session"
                    secondary
                    onPress={() => openSchedule()}
                  />
                </View>
                {scheduleList(
                  [...schedules].sort((a, b) =>
                    a.scheduledAt.localeCompare(b.scheduledAt),
                  ),
                )}
              </Card>
              <Card>
                <View style={s.row}>
                  {sectionTitle(
                    'Exercise library',
                    'Reusable sets, reps and weights',
                  )}
                  <Button
                    title="Add template"
                    secondary
                    onPress={() => openLibrary()}
                  />
                </View>
                {exercises.length ? (
                  exercises.map((e) => (
                    <View key={e._id} style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text }}>{e.name}</Text>
                        <Text style={s.muted}>
                          {e.sets} × {e.reps} · {e.weightKg} kg
                        </Text>
                      </View>
                      {actions('/exercises', e, () => openLibrary(e))}
                    </View>
                  ))
                ) : (
                  <Text style={s.muted}>
                    Save an exercise to quickly add it to any workout.
                  </Text>
                )}
              </Card>
            </>
          )}
          {tab === 'Progress' && (
            <>
              <View style={s.wrap}>
                {['daily', 'weekly', 'monthly'].map((p) => (
                  <Pressable
                    key={p}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: period === p }}
                    onPress={() => setPeriod(p)}
                    style={[
                      s.chip,
                      period === p && { backgroundColor: C.green },
                    ]}
                  >
                    <Text
                      style={{
                        color: period === p ? C.bg : C.text,
                        textTransform: 'capitalize',
                      }}
                    >
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Card>
                {sectionTitle(
                  'The bigger picture',
                  `Last ${data?.days || 7} days · through ${localDay()}`,
                )}
                <View style={s.wrap}>
                  {[
                    { id: 'steps', title: 'Steps' },
                    { id: 'duration', title: 'Minutes' },
                    { id: 'weightKg', title: 'Weight' },
                    { id: 'workouts', title: 'Frequency' },
                  ].map((m) => (
                    <Pressable
                      key={m.id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: metric === m.id }}
                      onPress={() => setMetric(m.id)}
                      style={[
                        s.chip,
                        metric === m.id && { backgroundColor: C.green },
                      ]}
                    >
                      <Text style={{ color: metric === m.id ? C.bg : C.text }}>
                        {m.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {data?.hasData ? (
                  <Chart
                    key={period + metric}
                    series={data.series}
                    metric={metric}
                  />
                ) : (
                  <Empty
                    title="Let your progress take shape"
                    description="Charts reflect your saved measurements and workouts. No sample readings are shown."
                  />
                )}
                {metric !== 'weightKg' && data && (
                  <View style={s.wrap}>
                    <Text style={s.muted}>
                      This period:{' '}
                      <Text style={{ color: C.green }}>
                        {fmt(data.totals[metric])}
                      </Text>
                    </Text>
                    <Text style={s.muted}>
                      Previous period: {fmt(data.previous[metric])}
                    </Text>
                    <Text style={s.muted}>
                      {data.previous[metric] > 0
                        ? `${Math.round(((data.totals[metric] - data.previous[metric]) / data.previous[metric]) * 100)}% change`
                        : 'No previous activity for comparison'}
                    </Text>
                  </View>
                )}
              </Card>
              <Card>
                <View style={s.row}>
                  {sectionTitle(
                    'Goal check',
                    'Daily and rolling seven-day targets',
                  )}
                  <Button
                    title="Set goal"
                    secondary
                    onPress={() => openGoal()}
                  />
                </View>
                {data?.goals.length ? (
                  data.goals.map((g: any) => (
                    <View key={g._id} style={{ gap: 10 }}>
                      <View style={s.row}>
                        <Text
                          style={{ color: C.text, textTransform: 'capitalize' }}
                        >
                          {g.period}{' '}
                          {g.metric === 'duration'
                            ? 'active minutes'
                            : g.metric}
                        </Text>
                        <Text style={{ color: C.green }}>{g.percent}%</Text>
                      </View>
                      <View
                        style={{
                          height: 7,
                          backgroundColor: C.border,
                          borderRadius: 5,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${g.percent}%`,
                            height: 7,
                            backgroundColor: C.green,
                          }}
                        />
                      </View>
                      <Text style={s.muted}>
                        {fmt(g.actual)} / {fmt(g.target)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={s.muted}>
                    Set a goal to measure the habits that matter to you.
                  </Text>
                )}
              </Card>
              <Card>
                <View style={s.row}>
                  {sectionTitle(
                    'Daily measurements',
                    'Manual daily totals; saving replaces entered fields',
                  )}
                  <Button
                    title="Check in"
                    secondary
                    onPress={() => openRecord()}
                  />
                </View>
                {records.length ? (
                  records.map((r) => (
                    <View key={r._id} style={[s.row, { paddingVertical: 8 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text }}>{r.date}</Text>
                        <Text style={s.muted}>
                          {r.steps !== undefined
                            ? `${fmt(r.steps)} steps · `
                            : ''}
                          {r.weightKg !== undefined
                            ? `${r.weightKg} kg · `
                            : ''}
                          {r.heartRateBpm !== undefined
                            ? `${r.heartRateBpm} bpm · `
                            : ''}
                          manual
                        </Text>
                      </View>
                      {actions('/records', r, () => openRecord(r))}
                    </View>
                  ))
                ) : (
                  <Empty
                    title="Check in with yourself"
                    description="Record steps, weight or a heart rate measured by your device."
                  />
                )}
              </Card>
            </>
          )}
          {tab === 'Profile' && (
            <>
              <Card>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{user.name}</Text>
                    <Text style={s.muted}>{user.email}</Text>
                  </View>
                  <Button
                    title="Edit profile"
                    secondary
                    onPress={() =>
                      setForm({
                        title: 'Your profile',
                        fields: [
                          { key: 'name', label: 'Name', initial: user.name },
                        ],
                        submit: async (v) => {
                          const u = await api('/profile', 'PATCH', v);
                          setUser(u);
                          setNotice('Profile updated');
                        },
                      })
                    }
                  />
                </View>
              </Card>
              <Card>
                <View style={s.row}>
                  {sectionTitle(
                    'Your goals',
                    'Aim for consistency, not perfection',
                  )}
                  <Button
                    title="Add goal"
                    secondary
                    onPress={() => openGoal()}
                  />
                </View>
                {goals.length ? (
                  goals.map((g) => (
                    <View key={g._id} style={s.row}>
                      <Text
                        style={{
                          color: C.text,
                          flex: 1,
                          textTransform: 'capitalize',
                        }}
                      >
                        {g.period} {g.metric}: {fmt(g.target)}
                      </Text>
                      {actions('/goals', g, () => openGoal(g))}
                    </View>
                  ))
                ) : (
                  <Text style={s.muted}>
                    Try a daily step target or a weekly workout goal.
                  </Text>
                )}
              </Card>
              <Card>
                <View style={s.row}>
                  {sectionTitle(
                    'A gentle nudge',
                    'Daily reminders on this device',
                  )}
                  <Button
                    title="Add reminder"
                    secondary
                    onPress={() => openReminder()}
                  />
                </View>
                <Text style={s.muted}>
                  Schedules and reminders are saved to your account. Enable
                  device notifications here after signing in. Local times follow
                  this device’s timezone; reopen the app after changing
                  timezones. Web notifications are unavailable.
                </Text>
                <Button
                  title="Enable device notifications"
                  secondary
                  icon="notifications-outline"
                  onPress={async () => {
                    try {
                      await configureNotifications(reminders, schedules, true);
                      setNotice(
                        'Notifications enabled on this device. Scheduled sessions and daily reminders are active.',
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />
                {reminders.map((r) => (
                  <View style={s.row} key={r._id}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text }}>{r.title}</Text>
                      <Text style={s.muted}>
                        {String(r.hour).padStart(2, '0')}:
                        {String(r.minute).padStart(2, '0')} ·{' '}
                        {r.enabled ? 'enabled' : 'disabled'}
                      </Text>
                    </View>
                    {actions('/reminders', r, () => openReminder(r))}
                  </View>
                ))}
                <Text style={[s.muted, { fontSize: 11 }]}>
                  A goal celebration can appear when you open or refresh the app
                  and a target is reached. The app does not monitor goals in the
                  background.
                </Text>
              </Card>
              <Card>
                {sectionTitle(
                  'Connected health',
                  'Your data, with your permission',
                )}
                {integrations.map((i) => (
                  <View key={i.id} style={{ gap: 5, paddingVertical: 10 }}>
                    <View style={s.row}>
                      <Text style={{ color: C.text, fontWeight: '600' }}>
                        {i.name}
                      </Text>
                      <Text
                        style={{
                          color: i.available ? C.green : C.orange,
                          fontSize: 12,
                        }}
                      >
                        {i.available ? 'Available' : 'Not configured'}
                      </Text>
                    </View>
                    <Text style={s.muted}>{i.description}</Text>
                  </View>
                ))}
              </Card>
              <Button
                title="Sign out"
                secondary
                icon="log-out-outline"
                onPress={async () => {
                  try {
                    await clearNotifications();
                    await saveToken(null);
                    setUser(null);
                    setData(null);
                    setTab('Home');
                    setNotice('');
                    setError('');
                  } catch (e) {
                    setError(
                      'Could not clear this device’s session. Please try again.',
                    );
                  }
                }}
              />
              <Text style={s.muted}>
                Web sessions live in memory and end on page reload. Native
                tokens are stored in the device’s secure storage. Fitness
                records are general wellness information, not medical advice.
              </Text>
            </>
          )}
          <View style={{ alignItems: 'center', paddingTop: 15 }}>
            <Text style={{ color: C.muted, fontSize: 10, letterSpacing: 2 }}>
              A LITTLE BETTER, EVERY DAY · PULSE
            </Text>
          </View>
        </ScrollView>
      </View>
      {!wide && (
        <View
          style={{
            flexDirection: 'row',
            paddingTop: 12,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderColor: C.border,
            backgroundColor: C.panel,
          }}
        >
          {(['Home', 'Workouts', 'Progress', 'Profile'] as Tab[]).map(
            (t, i) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityLabel={t}
                accessibilityState={{ selected: tab === t }}
                onPress={() => setTab(t)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                }}
              >
                <Icon
                  name={
                    [
                      'grid-outline',
                      'barbell-outline',
                      'stats-chart-outline',
                      'person-outline',
                    ][i]
                  }
                  color={tab === t ? C.green : C.muted}
                />
                <Text
                  style={{ color: tab === t ? C.green : C.muted, fontSize: 11 }}
                >
                  {t}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      )}
      {form && (
        <FormModal
          key={form.title}
          title={form.title}
          fields={form.fields}
          onClose={() => setForm(null)}
          onSubmit={form.submit}
        />
      )}
      {deletion && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !deleteBusy && setDeletion(null)}
        >
          <View style={s.overlay}>
            <Card style={{ width: '100%', maxWidth: 400 }}>
              <Text style={s.h2}>Delete {deletion.name}?</Text>
              <Text style={s.muted}>
                This permanently removes the saved item.
              </Text>
              <Button
                title={deleteBusy ? 'Deleting…' : 'Delete item'}
                disabled={deleteBusy}
                onPress={async () => {
                  setDeleteBusy(true);
                  try {
                    await mutate(deletion.path, 'DELETE');
                    setDeletion(null);
                  } catch (e) {
                    setError((e as Error).message);
                    setDeletion(null);
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
              />
              <Button
                title="Keep it"
                secondary
                disabled={deleteBusy}
                onPress={() => setDeletion(null)}
              />
            </Card>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
