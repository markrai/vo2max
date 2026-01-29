export function todayName(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

export function formatISO8601UTC(timestamp: number): string {
  return new Date(timestamp).toISOString();
}
