import { describe, expect, it } from "vitest";

import {
  EMPTY,
  compactNumber,
  formatChange,
  formatDate,
  formatMetric,
  formatMoney,
  formatPercent,
  formatRange,
  formatRoas,
} from "@/lib/format";
import { addDays, daysBetween } from "@/lib/filters";

describe("formatters", () => {
  it("never renders missing values as zero", () => {
    expect(formatMoney(null, "INR")).toBe(EMPTY);
    expect(formatPercent(undefined)).toBe(EMPTY);
    expect(formatRoas(null)).toBe(EMPTY);
    expect(formatMetric("leads", null, "INR")).toBe(EMPTY);
    expect(formatMoney(0, "INR")).toBe("₹0.00");
  });

  it("formats rupees in the Indian grouping", () => {
    expect(formatMoney(1234567, "INR")).toBe("₹12,34,567");
    expect(formatMoney(45.5, "INR")).toBe("₹45.50");
    expect(formatMoney(504345, "INR", { compact: true })).toBe("₹5.04L");
  });

  it("uses lakh and crore for compact numbers", () => {
    expect(compactNumber(1500)).toBe("1.5K");
    expect(compactNumber(250000)).toBe("2.5L");
    expect(compactNumber(12500000)).toBe("1.25Cr");
  });

  it("formats ratios and changes with sign", () => {
    expect(formatRoas(8.2)).toBe("8.20×");
    expect(formatPercent(1.23456)).toBe("1.23%");
    expect(formatChange(12.44)).toBe("+12.4%");
    expect(formatChange(-3)).toBe("-3.0%");
    expect(formatChange(null)).toBe(EMPTY);
  });

  it("formats dates without timezone shifts", () => {
    expect(formatDate("2026-10-24")).toBe("24 Oct 2026");
    expect(formatRange("2026-09-25", "2026-10-24")).toBe("25 Sep – 24 Oct 2026");
    expect(formatRange("2025-12-01", "2026-01-31")).toBe("1 Dec 2025 – 31 Jan 2026");
  });

  it("does date arithmetic in UTC", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-01", "2026-10-30")).toBe(30);
  });
});
