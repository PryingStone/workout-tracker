import mongoose, { Schema } from 'mongoose';
const options = { timestamps: true, toJSON: { versionKey: false } };
const owner = {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true,
  index: true,
};
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
  },
  options,
);
export const User = mongoose.model('User', userSchema);
const exerciseSchema = new Schema(
  {
    user: owner,
    name: { type: String, required: true },
    sets: { type: Number, min: 1, required: true },
    reps: { type: Number, min: 0, required: true },
    weightKg: { type: Number, min: 0, required: true },
    durationMinutes: { type: Number, min: 0, required: true },
  },
  options,
);
export const Exercise = mongoose.model('Exercise', exerciseSchema);
const sessionSchema = new Schema(
  {
    user: owner,
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['strength', 'running', 'walking', 'cycling', 'yoga', 'other'],
      required: true,
    },
    date: { type: String, required: true },
    durationMinutes: { type: Number, min: 1, required: true },
    caloriesEstimate: { type: Number, min: 0, required: true },
    exercises: [
      {
        name: String,
        sets: Number,
        reps: Number,
        weightKg: Number,
        durationMinutes: Number,
      },
    ],
    notes: String,
  },
  options,
);
sessionSchema.index({ user: 1, date: -1 });
export const WorkoutSession = mongoose.model('WorkoutSession', sessionSchema);
const recordSchema = new Schema(
  {
    user: owner,
    date: { type: String, required: true },
    steps: { type: Number, min: 0 },
    weightKg: { type: Number, min: 20, max: 400 },
    heartRateBpm: { type: Number, min: 30, max: 240 },
    source: { type: String, enum: ['manual'], default: 'manual' },
  },
  options,
);
recordSchema.index({ user: 1, date: 1 }, { unique: true });
export const FitnessRecord = mongoose.model('FitnessRecord', recordSchema);
const goalSchema = new Schema(
  {
    user: owner,
    metric: {
      type: String,
      enum: ['steps', 'duration', 'workouts'],
      required: true,
    },
    period: { type: String, enum: ['daily', 'weekly'], required: true },
    target: { type: Number, min: 1, required: true },
  },
  options,
);
goalSchema.index({ user: 1, metric: 1, period: 1 }, { unique: true });
export const FitnessGoal = mongoose.model('FitnessGoal', goalSchema);
const scheduleSchema = new Schema(
  {
    user: owner,
    name: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'missed'],
      default: 'scheduled',
    },
  },
  options,
);
scheduleSchema.index({ user: 1, scheduledAt: 1 });
export const WorkoutSchedule = mongoose.model(
  'WorkoutSchedule',
  scheduleSchema,
);
const reminderSchema = new Schema(
  {
    user: owner,
    title: { type: String, required: true },
    hour: { type: Number, min: 0, max: 23, required: true },
    minute: { type: Number, min: 0, max: 59, required: true },
    enabled: { type: Boolean, default: true },
  },
  options,
);
export const Reminder = mongoose.model('Reminder', reminderSchema);
