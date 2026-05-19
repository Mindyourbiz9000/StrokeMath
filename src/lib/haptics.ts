/** Short vibration for eyes-free confirmation on the course. No-op if unsupported. */
export function buzz(pattern: number | number[] = 18): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported / blocked */
  }
}
