import { appConfig } from "./config";
import type {
  Address,
  AiAssessment,
  ChainStatus,
  DealView,
  HealthStatus,
  Hex,
  OfferJson,
  OfferView,
} from "./types";

/** Hub errors keep Fastify's `{ statusCode, error, message }` shape — surface all three. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${appConfig.apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: { error?: string; message?: string } | null = null;
    try {
      body = (await res.json()) as { error?: string; message?: string };
    } catch {
      // non-JSON error body — fall through to the status text
    }
    throw new ApiError(
      res.status,
      body?.error ?? res.statusText,
      body?.message ?? `${res.status} ${res.statusText}`,
    );
  }
  return (await res.json()) as T;
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

export const api = {
  health: () => request<HealthStatus>("/health"),
  systemStatus: () => request<ChainStatus>("/system/status"),

  listDeals: (params: { state?: string; party?: string } = {}) =>
    request<DealView[]>(`/deals${qs(params)}`),
  getDeal: (id: string) => request<DealView>(`/deals/${id}`),
  listDisputes: () => request<DealView[]>("/disputes"),

  listOffers: (params: { seller?: string; open?: boolean } = {}) =>
    request<OfferView[]>(
      `/offers${qs({ seller: params.seller, open: params.open ? "true" : undefined })}`,
    ),
  getOffer: (hash: string) => request<OfferView>(`/offers/${hash}`),
  postOffer: (body: { offer: OfferJson; signature: Hex }) =>
    request<{ offerHash: Hex }>("/offers", { method: "POST", body: JSON.stringify(body) }),

  triage: (dealId: string) =>
    request<AiAssessment>(`/arbiter/triage/${dealId}`, { method: "POST" }),

  relayDispute: (body: { dealId: Hex; reason: string; evidenceRef?: string }) =>
    request<{ ok: true }>("/relay/dispute", { method: "POST", body: JSON.stringify(body) }),
  relayDelivery: (body: {
    dealId: Hex;
    payloadHash: Hex;
    payloadRef?: string;
    blobBase64?: string;
  }) => request<{ ok: true }>("/relay/delivery", { method: "POST", body: JSON.stringify(body) }),

  credits: (address: Address) =>
    request<{ address: Address; amount: string }>(`/credits/${address}`),
};
