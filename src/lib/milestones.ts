import { MILESTONES } from "./constants";

export function milestoneProgress(coins: number) {
  const next = MILESTONES.find((m) => coins < m.coins) ?? null;
  const unlocked = MILESTONES.filter((m) => coins >= m.coins);

  if (!next) {
    return {
      coins,
      unlocked,
      next: null,
      percentToNext: 100,
      remainingToNext: 0,
    };
  }

  const previousThreshold =
    unlocked.length > 0 ? unlocked[unlocked.length - 1].coins : 0;
  const span = next.coins - previousThreshold;
  const progress = coins - previousThreshold;

  return {
    coins,
    unlocked,
    next,
    percentToNext: Math.min(100, Math.round((progress / span) * 100)),
    remainingToNext: Math.max(0, next.coins - coins),
  };
}
