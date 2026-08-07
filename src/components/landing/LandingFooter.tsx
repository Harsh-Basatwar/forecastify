import Link from "next/link";
import { TrendingUp } from "lucide-react";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Forecasts", href: "/dashboard/forecasts" },
      { label: "Inventory", href: "/dashboard/inventory" },
      { label: "Procurement", href: "/dashboard/procurement" },
      { label: "Explainability", href: "/dashboard/explainability" },
    ],
  },
  {
    heading: "On this page",
    links: [
      { label: "Why", href: "#cost" },
      { label: "How it thinks", href: "#story" },
      { label: "Reasoning", href: "#reasoning" },
      { label: "Autopilot", href: "#autopilot" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/auth/login" },
      { label: "Create account", href: "/auth/signup" },
      { label: "Browser extension", href: "/dashboard/extension" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t bg-[var(--background-subtle)]">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-foreground)]">
                <TrendingUp size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="fx-display text-[17px] leading-none">Forecastify</span>
            </div>
            <p className="mt-5 max-w-[38ch] text-[14px] leading-relaxed text-[var(--muted-foreground)]">
              Demand forecasting for kirana stores and independent retailers, built so
              the shopkeeper stays the one deciding.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} className="lg:col-span-2" aria-label={col.heading}>
              <h2 className="text-[13px] font-semibold">{col.heading}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="fx-underline text-[13.5px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="fx-rule mt-14 flex flex-wrap items-center justify-between gap-4 pt-6">
          <p className="text-[12.5px] text-[var(--muted-foreground)]">
            Forecastify. Released under the MIT License.
          </p>
          <p className="text-[12.5px] text-[var(--muted-foreground)]">
            Figures shown on this page are illustrative.
          </p>
        </div>
      </div>
    </footer>
  );
}
