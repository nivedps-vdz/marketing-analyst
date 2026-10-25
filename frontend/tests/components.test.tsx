import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KpiCard } from "@/components/analytics/KpiCard";
import { SidebarNav } from "@/components/layout/Sidebar";
import { ChangePill } from "@/components/ui/ChangePill";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

describe("KpiCard", () => {
  it("shows 'Not available' with the reason instead of zero", () => {
    render(
      <KpiCard
        metricKey="roas"
        metric={{ value: null, unavailable_reason: "No sales-objective campaigns in this selection" }}
        currency="INR"
        previousDays={30}
      />,
    );
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText("No sales-objective campaigns in this selection")).toBeInTheDocument();
    expect(screen.queryByText("0.00×")).not.toBeInTheDocument();
  });

  it("renders the value and previous period", () => {
    render(
      <KpiCard
        metricKey="spend"
        metric={{ value: 504345, unavailable_reason: null, previous: 540000, change_pct: -6.6, direction: "down", assessment: "neutral" }}
        currency="INR"
        previousDays={30}
      />,
    );
    expect(screen.getByTestId("kpi-spend")).toHaveTextContent("₹5.04L");
    expect(screen.getByText(/previous 30 days/)).toBeInTheDocument();
  });
});

describe("ChangePill", () => {
  it("marks a falling cost per lead as favourable and shows direction without relying on colour", () => {
    render(<ChangePill metric={{ value: 200, unavailable_reason: null, change_pct: -20, direction: "down", assessment: "good" }} />);
    const pill = screen.getByLabelText(/-20.0% versus previous period, favourable/);
    expect(pill).toHaveAttribute("data-assessment", "good");
    expect(pill).toHaveTextContent("-20.0%");
  });

  it("renders nothing when the change is undefined", () => {
    const { container } = render(<ChangePill metric={{ value: 5, unavailable_reason: null, change_pct: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Sidebar", () => {
  it("highlights the active section, including nested routes, and keeps global filters in links", () => {
    render(<SidebarNav pathname="/clients/3" query="?start=2026-10-01&end=2026-10-24" />);
    const active = screen.getByRole("link", { name: "Clients" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active.className).toContain("bg-brand-soft");
    expect(active).toHaveAttribute("href", "/clients?start=2026-10-01&end=2026-10-24");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    for (const label of ["Dashboard", "Clients", "Campaigns", "Ads", "Creative Intelligence", "Competitors", "Reports", "Automations", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
