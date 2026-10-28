import {
  FitnessGoal,
  FitnessRecord,
  WorkoutSchedule,
  WorkoutSession,
} from './models.js';
export const shift = (day: string, amount: number) => {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
};
export async function analytics(user: string, end: string, days: number) {
  const count = Math.max(days * 2, 7);
  const start = shift(end, -(count - 1));
  const [records, workouts, goals, schedules] = await Promise.all([
    FitnessRecord.find({ user, date: { $gte: start, $lte: end } }).lean(),
    WorkoutSession.find({ user, date: { $gte: start, $lte: end } })
      .sort({ date: -1, createdAt: -1 })
      .lean(),
    FitnessGoal.find({ user }).lean(),
    WorkoutSchedule.find({ user }).sort({ scheduledAt: 1 }).lean(),
  ]);
  const series = Array.from({ length: count }, (_, i) => {
    const date = shift(start, i),
      r = records.find((r) => r.date === date),
      w = workouts.filter((w) => w.date === date);
    return {
      date,
      steps: r?.steps ?? 0,
      weightKg: r?.weightKg ?? null,
      heartRateBpm: r?.heartRateBpm ?? null,
      duration: w.reduce((n, x) => n + x.durationMinutes, 0),
      workouts: w.length,
      caloriesEstimate: w.reduce((n, x) => n + x.caloriesEstimate, 0),
    };
  });
  const sum = (items: typeof series) => ({
    steps: items.reduce((n, x) => n + x.steps, 0),
    duration: items.reduce((n, x) => n + x.duration, 0),
    workouts: items.reduce((n, x) => n + x.workouts, 0),
    caloriesEstimate: items.reduce((n, x) => n + x.caloriesEstimate, 0),
  });
  const current = series.slice(-days),
    previous = series.slice(count - days * 2, count - days),
    today = series.at(-1)!;
  const weekly = series.filter((x) => x.date >= shift(end, -6));
  return {
    date: end,
    days,
    today,
    totals: sum(current),
    previous: sum(previous),
    series: current,
    hasData:
      records.some((r) => r.date! >= current[0].date) ||
      workouts.some((w) => w.date >= current[0].date),
    goals: goals.map((g) => {
      const actual =
        g.period === 'daily'
          ? today[g.metric as 'steps' | 'duration' | 'workouts']
          : sum(weekly)[g.metric as 'steps' | 'duration' | 'workouts'];
      return {
        ...g,
        actual,
        percent: Math.min(100, Math.round((actual / g.target) * 100)),
      };
    }),
    recentWorkouts: workouts
      .filter((w) => w.date >= current[0].date)
      .slice(0, 5),
    schedules: schedules.map((s) => ({
      ...s,
      status:
        s.status === 'scheduled' && s.scheduledAt < new Date()
          ? 'missed'
          : s.status,
    })),
    sources: {
      measurements: 'manual',
      calories:
        'Estimated using activity MET × 3.5 × weight (kg) / 200 × minutes. Uses latest weight or 70 kg fallback; not a medical measurement.',
    },
  };
}
