import type { Metadata } from "next";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import CostOfGuessing from "@/components/landing/CostOfGuessing";
import SignalBand from "@/components/landing/SignalBand";
import StoryScroll from "@/components/landing/StoryScroll";
import ShowsItsWork from "@/components/landing/ShowsItsWork";
import AutopilotBento from "@/components/landing/AutopilotBento";
import SpeaksYourLanguage from "@/components/landing/SpeaksYourLanguage";
import ClosingCta from "@/components/landing/ClosingCta";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Forecastify · Demand forecasting for kirana stores",
  description:
    "Forecastify reads weather, festivals and your own sales log to say what to stock next, and shows the reasoning behind every number.",
  openGraph: {
    title: "Forecastify · Demand forecasting for kirana stores",
    description:
      "Stock what sells. Skip what does not. Forecasts that explain themselves, and never order without you.",
    type: "website",
  },
};

/**
 * Public landing page.
 *
 * `/` no longer bounces straight to the console. Signed-in visitors still get
 * there in one click: every primary call to action resolves to /dashboard once
 * a session exists, and /dashboard keeps its own auth guard either way.
 */
export default function Home() {
  return (
    <>
      <a href="#main" className="fx-skip-link">
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        <Hero />
        <CostOfGuessing />
        <SignalBand />
        <StoryScroll />
        <ShowsItsWork />
        <AutopilotBento />
        <SpeaksYourLanguage />
        <ClosingCta />
      </main>
      <LandingFooter />
    </>
  );
}
