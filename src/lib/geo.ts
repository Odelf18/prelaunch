export type GeoResult = {
  city: string | null;
  region: string | null;
  country: string | null;
  ip: string;
  source: "ipapi" | "mock" | "header";
};

const MOCK_LOCATIONS: Omit<GeoResult, "ip" | "source">[] = [
  { city: "Austin", region: "Texas", country: "United States" },
  { city: "London", region: "England", country: "United Kingdom" },
  { city: "Berlin", region: "Berlin", country: "Germany" },
  { city: "Toronto", region: "Ontario", country: "Canada" },
  { city: "Singapore", region: "Singapore", country: "Singapore" },
  { city: "Paris", region: "Île-de-France", country: "France" },
];

export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

export async function resolveGeo(
  ip: string,
  opts?: { forceMock?: boolean },
): Promise<GeoResult> {
  if (
    opts?.forceMock ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    process.env.GEO_MOCK === "1"
  ) {
    const pick = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
    return { ...pick, ip, source: "mock" };
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "prelaunch-engine/1.0" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error(`geo ${res.status}`);
    const data = (await res.json()) as {
      city?: string;
      region?: string;
      country_name?: string;
      error?: boolean;
    };
    if (data.error) throw new Error("geo error");
    return {
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country_name ?? null,
      ip,
      source: "ipapi",
    };
  } catch {
    const pick = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
    return { ...pick, ip, source: "mock" };
  }
}
