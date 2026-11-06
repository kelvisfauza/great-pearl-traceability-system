import { describe, it, expect } from "vitest";
import { findSimilarSamplingOrders } from "./samplingDuplicates";

const orders = [{ supplier_name: "David Kakusi" }, { supplier_name: "Sele" }, { supplier_name: "Masereka Andrew" }];

describe("sampling order duplicate check", () => {
  it("flags the same supplier typed differently", () => {
    expect(findSimilarSamplingOrders("david  KAKUSI", orders)).toHaveLength(1);
  });
  it("flags a related name sharing a word", () => {
    expect(findSimilarSamplingOrders("Andrew", orders).map((o) => o.supplier_name)).toEqual(["Masereka Andrew"]);
  });
  it("does not flag an unrelated supplier", () => {
    expect(findSimilarSamplingOrders("Bwambale Benson", orders)).toHaveLength(0);
  });
});
