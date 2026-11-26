import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { excelInput } from "./input.ts";
const valid = { workbook: "Daily Coffee Intake", sheet: "Intake (90d)", headers: ["Weight"], rows: [[12]] };
Deno.test("Excel only permits registered report destinations", () => {
  assertEquals(excelInput(valid).folder, "GAC-System-Reports");
  for (const patch of [{ folder: "Private" }, { workbook: "Salary" }, { sheet: "Other" }]) assertThrows(() => excelInput({ ...valid, ...patch }));
});
Deno.test("Excel rejects malformed data before clearing a sheet", () => {
  for (const rows of [[[1, 2]], [[{}]], [[Infinity]], "bad"]) assertThrows(() => excelInput({ ...valid, rows }));
});