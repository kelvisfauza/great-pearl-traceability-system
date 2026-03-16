import type { ReactNode } from "react";

export type MarketDirection = "upside" | "downside" | "neutral";

export interface LiveIcePrices {
  iceArabica: number | null;
  iceRobusta: number | null;
  fetchedAt?: string;
  source?: string;
}

export interface CoffeeHeadline {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  sentiment: MarketDirection;
  region?: "africa" | "global";
}

export interface CoffeeMarketBriefing {
  summary: string;
  arabicaDirection: MarketDirection;
  robustaDirection: MarketDirection;
  bullishReasons: string[];
  bearishReasons: string[];
  headlines: CoffeeHeadline[];
  updatedAt: string;
  source: string;
}

export interface CoffeeMarketSnapshot {
  iceArabica?: number | null;
  iceRobusta?: number | null;
  exchangeRate?: number | null;
  localArabica?: number | null;
  localRobusta?: number | null;
  history: Array<{
    date: string;
    iceArabica?: number | null;
    iceRobusta?: number | null;
    localArabica?: number | null;
    localRobusta?: number | null;
  }>;
}

export interface DisplaySlide {
  id: string;
  label: string;
  duration: number;
  content: ReactNode;
}
