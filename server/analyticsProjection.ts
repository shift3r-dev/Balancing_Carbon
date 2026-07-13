export function linearProjection(rows: Array<{ period: string; value: number }>, periods = 3) {
  if (rows.length < 2) return [];
  const n = rows.length, sumX = n * (n - 1) / 2, sumY = rows.reduce((sum, row) => sum + row.value, 0);
  const sumXY = rows.reduce((sum, row, index) => sum + index * row.value, 0), sumXX = rows.reduce((sum, _row, index) => sum + index * index, 0);
  const denominator = n * sumXX - sumX * sumX, slope = denominator ? (n * sumXY - sumX * sumY) / denominator : 0, intercept = (sumY - slope * sumX) / n;
  const last = new Date(`${rows.at(-1)!.period}-01T00:00:00Z`);
  return Array.from({ length: periods }, (_item, index) => { const date = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + index + 1, 1)); return { period: date.toISOString().slice(0, 7), value: Math.max(0, intercept + slope * (n + index)), method: 'ordinary-least-squares', observations: n }; });
}
