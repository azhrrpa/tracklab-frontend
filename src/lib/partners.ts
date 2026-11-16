/**
 * Known partner (customer) names by id.
 *
 * The assessment API has no partner endpoint and its requests only carry `partnerId`.
 * Every request in the shared data uses 93f25c4d…, the id from the Postman examples,
 * and the provided design shows those requests as "PT KALBE FARMA TBK".
 * Add more entries here if more partners appear; unknown ids show a short id instead.
 */
export const KNOWN_PARTNERS: Record<string, string> = {
  "93f25c4d-f903-b587-9671-66d4fb302c67": "PT KALBE FARMA TBK",
};

export function partnerName(partnerId: string | null | undefined): string | null {
  return partnerId ? (KNOWN_PARTNERS[partnerId.toLowerCase()] ?? null) : null;
}
