import { NextResponse } from "next/server";
import { Currency } from "@/lib/types";

const SUPPORTED: Currency[] = ["USD", "EUR", "INR", "BHD"];

// Free, no-API-key exchange rate feed (daily updates), base = USD.
const SOURCE_URL = "https://open.er-api.com/v6/latest/USD";

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Upstream error ${res.status}`);
    const data = await res.json();

    if (data.result !== "success" || !data.rates) {
      throw new Error("Unexpected upstream payload");
    }

    const rates: Record<Currency, number> = {} as Record<Currency, number>;
    for (const code of SUPPORTED) {
      rates[code] = data.rates[code];
    }

    return NextResponse.json({
      base: "USD",
      rates,
      updatedAt: new Date((data.time_last_update_unix ?? Date.now() / 1000) * 1000).toISOString(),
    });
  } catch {
    // Fallback so the UI still works if the upstream feed is briefly unreachable.
    return NextResponse.json({
      base: "USD",
      rates: { USD: 1, EUR: 0.92, INR: 88.0, BHD: 0.376 } as Record<Currency, number>,
      updatedAt: new Date().toISOString(),
      stale: true,
    });
  }
}
