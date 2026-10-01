import { describe, expect, it } from "vitest";
import { formatCurrency, fromPaise, paiseToInput, percent, toPaise } from "./money";

describe("toPaise", () => {
  it("converts rupees to integer paise", () => {
    expect(toPaise(10000)).toBe(1_000_000);
    expect(toPaise("1,299.99")).toBe(129_999);
    expect(toPaise("₹ 7,899")).toBe(789_900);
  });

  it("avoids floating point drift", () => {
    expect(toPaise(1.005)).toBe(101);
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise("19.99")).toBe(1999);
  });

  it("rejects invalid input", () => {
    expect(() => toPaise("abc")).toThrow();
    expect(() => toPaise(Number.NaN)).toThrow();
    expect(() => toPaise(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("formatting", () => {
  it("formats INR with Indian grouping and no needless decimals", () => {
    expect(formatCurrency(3_500_000)).toBe("₹35,000");
    expect(formatCurrency(12_345_678)).toBe("₹1,23,456.78");
  });

  it("supports signs", () => {
    expect(formatCurrency(10_100, { signed: true })).toBe("+₹101");
    expect(formatCurrency(-10_100)).toBe("−₹101");
  });

  it("round-trips through the edit format", () => {
    expect(paiseToInput(129_999)).toBe("1299.99");
    expect(toPaise(paiseToInput(129_999))).toBe(129_999);
    expect(fromPaise(250)).toBe(2.5);
  });

  it("computes bounded percentages", () => {
    expect(percent(50, 100)).toBe(50);
    expect(percent(150, 100)).toBe(100);
    expect(percent(10, 0)).toBe(100);
    expect(percent(0, 0)).toBe(0);
  });
});
