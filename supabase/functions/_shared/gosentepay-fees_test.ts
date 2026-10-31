import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { gosenteWithdrawFee } from "./gosentepay-fees.ts";
Deno.test("30,000 payout costs 1,600", () => assertEquals(gosenteWithdrawFee(30000), 1600));
Deno.test("60,000 payout costs 1,600", () => assertEquals(gosenteWithdrawFee(60000), 1600));
Deno.test("86,000 payout costs 2,200", () => assertEquals(gosenteWithdrawFee(86000), 2200));
