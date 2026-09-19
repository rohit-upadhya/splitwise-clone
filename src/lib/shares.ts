import { SplitType } from "./types";

/** Pure share computation shared by the client (optimistic) and server. */
export function computeShares(
  splitType: SplitType,
  amount: number,
  participantIds: string[],
  exactShares?: Record<string, number>,
  percentShares?: Record<string, number>
): Record<string, number> {
  let shares: Record<string, number> = {};
  if (splitType === "equal") {
    const per = Math.round((amount / participantIds.length) * 100) / 100;
    const remainder = Math.round((amount - per * participantIds.length) * 100) / 100;
    participantIds.forEach((pid, idx) => {
      shares[pid] = per + (idx === 0 ? remainder : 0);
    });
  } else if (splitType === "exact") {
    shares = { ...exactShares };
  } else if (splitType === "percent") {
    participantIds.forEach((pid) => {
      const pct = percentShares?.[pid] ?? 0;
      shares[pid] = Math.round(((amount * pct) / 100) * 100) / 100;
    });
  }
  return shares;
}
