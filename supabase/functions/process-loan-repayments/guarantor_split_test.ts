import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Mirrors splitGuarantorRecovery in index.ts: two guarantors share an
// unpaid installment equally; whoever can pay more covers the rest.
interface GuarantorWallet {
  slot: number
  email: string
  name: string
  phone: string
  userId: string
  balance: number
}

const splitGuarantorRecovery = (
  shortfall: number,
  guarantors: GuarantorWallet[],
): Array<GuarantorWallet & { taken: number }> => {
  const owed = Math.max(0, Math.round(shortfall || 0))
  if (guarantors.length === 0) return guarantors.map((g) => ({ ...g, taken: 0 }))
  if (owed <= 0) return guarantors.map((g) => ({ ...g, taken: 0 }))

  const equalShare = Math.ceil(owed / guarantors.length)
  const taken = guarantors.map(() => 0)
  let running = 0

  guarantors.forEach((g, i) => {
    const cap = Math.min(equalShare, owed - running)
    const amount = Math.max(0, Math.min(g.balance, cap))
    taken[i] = amount
    running += amount
  })

  let leftover = owed - running
  guarantors.forEach((g, i) => {
    if (leftover <= 0) return
    const spare = g.balance - taken[i]
    if (spare <= 0) return
    const extra = Math.min(spare, leftover)
    taken[i] += extra
    running += extra
    leftover -= extra
  })

  return guarantors.map((g, i) => ({ ...g, taken: taken[i] }))
}

const g = (slot: number, balance: number): GuarantorWallet => ({
  slot,
  email: `g${slot}@greatpearlcoffee.com`,
  name: `Guarantor ${slot}`,
  phone: `070000000${slot}`,
  userId: `user-${slot}`,
  balance,
})

const total = (shares: Array<{ taken: number }>) => shares.reduce((a, s) => a + s.taken, 0)

Deno.test("two able guarantors split the shortfall 50/50", () => {
  const shares = splitGuarantorRecovery(100000, [g(1, 200000), g(2, 200000)])
  assertEquals(shares.map((s) => s.taken), [50000, 50000])
})

Deno.test("first guarantor short of their half, second covers the remainder", () => {
  const shares = splitGuarantorRecovery(100000, [g(1, 10000), g(2, 200000)])
  assertEquals(shares.map((s) => s.taken), [10000, 90000])
  assertEquals(total(shares), 100000)
})

Deno.test("neither guarantor can pay — only what they hold is taken", () => {
  const shares = splitGuarantorRecovery(100000, [g(1, 5000), g(2, 5000)])
  assertEquals(shares.map((s) => s.taken), [5000, 5000])
  assertEquals(total(shares), 10000)
})

Deno.test("one guarantor only — they carry the whole shortfall", () => {
  const shares = splitGuarantorRecovery(100000, [g(1, 200000)])
  assertEquals(shares.map((s) => s.taken), [100000])
})

Deno.test("odd shortfall is never over-collected", () => {
  const shares = splitGuarantorRecovery(100001, [g(1, 200000), g(2, 200000)])
  assertEquals(total(shares), 100001)
  assertEquals(shares.map((s) => s.taken), [50001, 50000])
})

Deno.test("empty wallet for one guarantor does not halve the other's load", () => {
  const shares = splitGuarantorRecovery(100000, [g(1, 0), g(2, 200000)])
  assertEquals(shares.map((s) => s.taken), [0, 100000])
})

Deno.test("nothing owed means nothing taken", () => {
  const shares = splitGuarantorRecovery(0, [g(1, 200000), g(2, 200000)])
  assertEquals(shares.map((s) => s.taken), [0, 0])
})
