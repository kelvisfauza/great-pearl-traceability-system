export function temporaryPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `Temp${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}!`;
}

/** Rejection sampling keeps every six-digit code equally likely. */
export function sixDigitCode(): string {
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  let number: number;
  do { number = crypto.getRandomValues(new Uint32Array(1))[0]; } while (number >= limit);
  return (number % 1_000_000).toString().padStart(6, '0');
}

export function fourDigitCode(): string {
  const limit = Math.floor(0x1_0000_0000 / 9000) * 9000;
  let number: number;
  do { number = crypto.getRandomValues(new Uint32Array(1))[0]; } while (number >= limit);
  return String(1000 + number % 9000);
}