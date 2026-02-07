export function minToMs(min: number, withJitter: boolean = false) {
  const baseMs = min * 60 * 1000;

  if (withJitter) {
    const jitterAmount = Math.random() * (baseMs * 0.2);

    return Math.floor(baseMs + jitterAmount);
  }

  return baseMs;
}
