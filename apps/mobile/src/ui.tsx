import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polyline, Line } from 'react-native-svg';
export const C = {
  bg: '#0B100F',
  panel: '#151D1A',
  border: '#29362E',
  text: '#F2F5EC',
  muted: '#9AAA9F',
  green: '#C4F36B',
  teal: '#6DD6C2',
  orange: '#EAB888',
  red: '#FF9696',
};
export function Icon({
  name,
  color = C.muted,
  size = 21,
}: {
  name: any;
  color?: string;
  size?: number;
}) {
  return <Ionicons name={name} color={color} size={size} />;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: any;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon && <Icon name={icon} color={secondary ? C.text : C.bg} size={18} />}
      <Text
        style={{
          color: secondary ? C.text : C.bg,
          fontWeight: '700',
          fontSize: 14,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={{ paddingVertical: 30, alignItems: 'center', gap: 10 }}>
      <Icon name="leaf-outline" color={C.green} size={30} />
      <Text style={{ color: C.text, fontWeight: '600', fontSize: 16 }}>
        {title}
      </Text>
      <Text style={[s.muted, { textAlign: 'center', maxWidth: 340 }]}>
        {description}
      </Text>
    </View>
  );
}
export function Ring({
  percent,
  size = 120,
}: {
  percent: number;
  size?: number;
}) {
  const r = (size - 14) / 2,
    length = 2 * Math.PI * r;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={`${percent}% complete`}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.border}
          strokeWidth={9}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.green}
          strokeWidth={9}
          fill="none"
          strokeDasharray={`${(length * percent) / 100} ${length}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={{ color: C.text, fontSize: size / 4, fontWeight: '700' }}>
        {percent}%
      </Text>
      <Text style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>
        OF DAILY GOAL
      </Text>
    </View>
  );
}
export function Chart({
  series,
  metric,
  color = C.green,
}: {
  series: any[];
  metric: string;
  color?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const valid = series.filter((x) => x[metric] !== null),
    max = Math.max(1, ...valid.map((x) => x[metric]));
  const points = series.map((x, i) =>
    x[metric] === null
      ? null
      : {
          x: 12 + (i / Math.max(1, series.length - 1)) * 276,
          y: 95 - (x[metric] / max) * 75,
        },
  );
  const segments: (typeof points)[] = [];
  let segment: typeof points = [];
  for (const p of points) {
    if (p) segment.push(p);
    else if (segment.length) {
      segments.push(segment);
      segment = [];
    }
  }
  if (segment.length) segments.push(segment);
  const chosen = selected !== null ? series[selected] : null;
  return (
    <View>
      <View style={{ height: 25 }}>
        <Text style={s.muted}>
          {chosen
            ? `${chosen.date} · ${chosen[metric] ?? 'No reading'}${metric === 'weightKg' ? ' kg' : ''}`
            : 'Tap a day to inspect your data'}
        </Text>
      </View>
      <Svg height={115} width="100%" viewBox="0 0 300 115">
        {[20, 57, 95].map((y) => (
          <Line
            key={y}
            x1={0}
            x2={300}
            y1={y}
            y2={y}
            stroke={C.border}
            strokeDasharray="3 5"
          />
        ))}
        {segments.map((seg, i) => (
          <Polyline
            key={i}
            points={seg.map((p) => `${p!.x},${p!.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={3}
          />
        ))}
        {points.map(
          (p, i) =>
            p && (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={selected === i ? 5 : 2}
                fill={color}
              />
            ),
        )}
      </Svg>
      <View style={{ flexDirection: 'row' }}>
        {series.map((x, i) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${x.date}: ${x[metric] ?? 'No reading'}`}
            onPress={() => setSelected(i)}
            key={x.date}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 9,
              backgroundColor: selected === i ? C.border : 'transparent',
              borderRadius: 5,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 10 }}>
              {series.length > 10
                ? i % 5 === 0
                  ? x.date.slice(8)
                  : '·'
                : new Date(x.date + 'T12:00:00').toLocaleDateString(undefined, {
                    weekday: 'narrow',
                  })}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export type Field = {
  key: string;
  label: string;
  type?: 'number' | 'password' | 'email' | 'multiline';
  initial?: string;
  choices?: string[];
  optional?: boolean;
};
export function FormModal({
  title,
  fields,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: Field[];
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState(
      Object.fromEntries(fields.map((f) => [f.key, f.initial || ''])),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => !busy && onClose()}
    >
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.row}>
            <Text style={s.h2}>{title}</Text>
            <Pressable
              accessibilityLabel="Close form"
              disabled={busy}
              onPress={onClose}
            >
              <Icon name="close" />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16, paddingVertical: 22 }}
          >
            {fields.map((f) => (
              <View key={f.key}>
                <Label>
                  {f.label}
                  {f.optional ? ' (optional)' : ''}
                </Label>
                {f.choices ? (
                  <View style={s.wrap}>
                    {f.choices.map((c) => (
                      <Pressable
                        key={c}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: values[f.key] === c }}
                        onPress={() => setValues({ ...values, [f.key]: c })}
                        style={[
                          s.chip,
                          values[f.key] === c && { backgroundColor: C.green },
                        ]}
                      >
                        <Text
                          style={{
                            color: values[f.key] === c ? C.bg : C.text,
                            textTransform: 'capitalize',
                          }}
                        >
                          {c}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    accessibilityLabel={f.label}
                    style={[s.input, f.type === 'multiline' && { height: 110 }]}
                    value={values[f.key]}
                    onChangeText={(v) => setValues({ ...values, [f.key]: v })}
                    keyboardType={
                      f.type === 'number'
                        ? 'decimal-pad'
                        : f.type === 'email'
                          ? 'email-address'
                          : 'default'
                    }
                    autoCapitalize={f.type === 'email' ? 'none' : 'sentences'}
                    secureTextEntry={f.type === 'password'}
                    multiline={f.type === 'multiline'}
                    placeholderTextColor={C.muted}
                  />
                )}
              </View>
            ))}
            {error ? (
              <Text accessibilityRole="alert" style={{ color: C.red }}>
                {error}
              </Text>
            ) : null}
            <Button
              disabled={busy}
              title={busy ? 'Saving…' : 'Save changes'}
              onPress={async () => {
                setBusy(true);
                setError('');
                try {
                  for (const f of fields)
                    if (!f.optional && !values[f.key]?.trim())
                      throw new Error(`${f.label} is required`);
                  await onSubmit(values);
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not save');
                } finally {
                  setBusy(false);
                }
              }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: {
    padding: 24,
    gap: 24,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingBottom: 45,
  },
  card: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 22,
    padding: 22,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  h1: { fontSize: 32, fontWeight: '700', color: C.text, letterSpacing: -1 },
  h2: { fontSize: 20, fontWeight: '600', color: C.text, letterSpacing: -0.4 },
  muted: { color: C.muted, fontSize: 13, lineHeight: 20 },
  label: { color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  button: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondary: { backgroundColor: C.border },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    color: C.text,
    padding: 14,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.border,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#000B',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: C.panel,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: C.border,
  },
});
