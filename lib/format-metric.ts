// Tiny shared display-only formatter for weight_kg / hrv_ms readouts.
// Trainers can enter (or paste from a scale/wearable app) arbitrary decimal
// precision — e.g. 82.35714 — which looked inconsistent next to BMI's
// already-rounded caption. This rounds ONLY what's rendered on the trainer
// Biometrics cards and the trainee portal; it must never be used to round a
// value before it's stored or returned from a loader (lib/client-portal-read.ts
// keeps full precision on purpose — round at display time, in the component).
export function fmt1(value: number): string {
  return value.toFixed(1);
}
