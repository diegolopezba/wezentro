import { describe, it, expect } from "vitest";
import { parseDayCell } from "@/lib/inviteImport";

describe("parseDayCell", () => {
  it("reads a single day", () => {
    expect(parseDayCell("1")).toBe(1);
    expect(parseDayCell("Día 1")).toBe(1);
    expect(parseDayCell(2)).toBe(2);
  });
  it("treats full-pass words as full pass, even with a number", () => {
    expect(parseDayCell("Todos")).toBeNull();
    expect(parseDayCell("Pase completo")).toBeNull();
    expect(parseDayCell("Pase 2 días")).toBeNull();
    expect(parseDayCell("2 dias")).toBeNull();
    expect(parseDayCell("Ambos")).toBeNull();
  });
  it("leaves empty cells to the batch selection", () => {
    expect(parseDayCell("")).toBeUndefined();
    expect(parseDayCell("   ")).toBeUndefined();
  });
});
