import { dayPoints, isActiveDay, type DayTotals } from "./points";

export type Metric = "total" | "puzzle" | "pstreak" | "storm" | "racer";

export const METRICS: readonly Metric[] = ["total", "puzzle", "pstreak", "storm", "racer"];

/** Intensity 0–6. 0 = không hoạt động; 6 = cao nhất (tháp 6 khối, quân Vua). */
export type Intensity = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Ngưỡng bắt đầu của intensity 2…6 cho từng chỉ số.
 * Ví dụ "total": 1–4 → 1, 5–14 → 2, 15–29 → 3, 30–49 → 4, 50–79 → 5, 80+ → 6.
 */
export const THRESHOLDS: Readonly<Record<Metric, readonly [number, number, number, number, number]>> = {
  total: [5, 15, 30, 50, 80],
  puzzle: [3, 6, 10, 15, 25],
  pstreak: [5, 10, 15, 20, 30],
  storm: [10, 20, 30, 40, 50],
  racer: [15, 30, 45, 60, 80],
};

export function metricValue(d: DayTotals, metric: Metric): number {
  switch (metric) {
    case "total":
      return dayPoints(d);
    case "puzzle":
      return d.solved;
    case "pstreak":
      return d.pstreakBest;
    case "storm":
      return d.stormBest;
    case "racer":
      return d.racerBest;
  }
}

export function metricActive(d: DayTotals, metric: Metric): boolean {
  switch (metric) {
    case "total":
      return isActiveDay(d);
    case "puzzle":
      return d.solved + d.failed > 0;
    case "pstreak":
      return d.pstreakRuns > 0;
    case "storm":
      return d.stormRuns > 0;
    case "racer":
      return d.racerRuns > 0;
  }
}

/** Ngày có hoạt động luôn có intensity ít nhất 1, kể cả khi giá trị bằng 0. */
export function intensityOf(value: number, active: boolean, metric: Metric): Intensity {
  if (!active) return 0;
  let level = 1;
  for (const threshold of THRESHOLDS[metric]) if (value >= threshold) level++;
  return level as Intensity;
}

export function dayIntensity(d: DayTotals, metric: Metric): Intensity {
  return intensityOf(metricValue(d, metric), metricActive(d, metric), metric);
}
