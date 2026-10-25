// Thin fetch wrapper. All requests go to /api, which Next.js proxies to the local FastAPI backend.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | (string | number)[] | null | undefined>;

export function buildQuery(params: Params = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) v.forEach((item) => q.append(k, String(item)));
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function apiGet<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}${buildQuery(params)}`, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Cannot reach the analytics backend. Is it running on port 8000?", 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch {
      /* non-JSON error body */
    }
    if (res.status >= 500 && res.status !== 501) {
      detail = "The analytics backend is not responding. Start it with scripts\\dev-backend.ps1.";
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}
