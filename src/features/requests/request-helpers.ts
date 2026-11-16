import { shortId } from "@/lib/format";
import { KNOWN_PARTNERS, partnerName } from "@/lib/partners";
import type { LabRequest } from "@/lib/types";

/** Company name: from the response if present, else the known-partner list, else a short partner id. */
export function companyName(request: LabRequest) {
  return (
    request.partnerName ??
    request.companyName ??
    request.partner?.name ??
    request.partner?.partnerName ??
    partnerName(request.partnerId) ??
    `Partner ${shortId(request.partnerId, 8)}`
  );
}

export function requestDate(request: LabRequest) {
  return request.requestDate ?? request.createdOn ?? null;
}

export type PartnerOption = { id: string; name: string };

/** Partners seen in existing requests (there is no partner endpoint), for the partner dropdown. */
export function partnerOptions(requests: LabRequest[]): PartnerOption[] {
  const byId = new Map<string, string>(Object.entries(KNOWN_PARTNERS));
  for (const request of requests) {
    if (request.partnerId && !byId.has(request.partnerId)) {
      byId.set(request.partnerId, companyName(request));
    }
  }
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}
