/**
 * Crowd-Reported Ticket Status Computation Logic
 * Computes live concert ticket availability dynamically on the client.
 * Supports verified admin and organizer statuses, crowd consensus, and secondary organizer notes.
 */

import { ConcertEvent, EventStatus } from '../types/event';
import { parseTimestampToDate, formatRelativeTime } from './dateUtils';
import { STATUS_MAP, StatusConfig } from './statusUtils';

// ==========================================
// CONSTANTS (Required by specification)
// ==========================================
export const CROWD_AGREEMENT_THRESHOLD = 3; // Minimum distinct users required to confirm
export const CROWD_REPORT_WINDOW_MS = 90 * 60 * 1000; // 90 minutes in milliseconds

export type CrowdReportStatus = 'available' | 'low' | 'sold_out';

export interface CrowdReport {
  id: string; // equals user uid
  status: CrowdReportStatus;
  createdAt: any;
}

export type StatusBadgeType =
  | 'admin_verified'
  | 'organizer_verified'
  | 'crowd_confirmed'
  | 'unconfirmed'
  | 'default';

export interface ComputedStatusResult {
  status: EventStatus;
  badgeType: StatusBadgeType;
  label: string;
  details: string;
  secondaryNote?: string; // e.g. "Organizer says: Available (updated 15m ago)"
  agreementCount?: number;
  statusConfig: StatusConfig;
}

/**
 * Pure function to compute the displayed ticket status for an event.
 *
 * Rules:
 * 1. Both "admin" and "organizer" count as verified sources.
 * 2. Newest verified update beats older crowd reports:
 *    - If statusSource is "organizer", show "Verified by organizer".
 *    - If statusSource is "admin", show "Admin Verified".
 * 3. If crowd reports are newer:
 *    - Filter reports from the last 90 minutes.
 *    - If >= 3 distinct users agree on the same status, show as confirmed with
 *      "Confirmed by N people • updated X min ago", plus secondary note:
 *      "Organizer says: X (updated N min ago)" [or "Admin says..."].
 *    - If < 3 users agree, show "Unconfirmed" with a neutral badge and latest report time,
 *      plus secondary note: "Organizer says: X (updated N min ago)".
 *
 * --------------------------------------------------------------------------------
 * UNIT-TEST-STYLE EXAMPLES:
 *
 * Example 1 (Organizer update newer than reports):
 * Event: status = "available", statusSource = "organizer", statusUpdatedAt = 10:00 AM
 * Reports: [ { id: 'u1', status: 'sold_out', createdAt: 09:30 AM } ]
 * -> Returns: status: 'available', badgeType: 'organizer_verified',
 *             details: 'Verified by organizer • updated 5m ago'
 *
 * Example 2 (Admin update newer than reports):
 * Event: status = "sold_out", statusSource = "admin", statusUpdatedAt = 10:00 AM
 * Reports: [ { id: 'u1', status: 'available', createdAt: 09:40 AM } ]
 * -> Returns: status: 'sold_out', badgeType: 'admin_verified',
 *             details: 'Admin Verified • updated 5m ago'
 *
 * Example 3 (Crowd consensus >= 3 agreeing users newer than organizer):
 * Event: status = "available", statusSource = "organizer", statusUpdatedAt = 08:30 AM
 * Now: 10:00 AM (window starts at 08:30 AM)
 * Reports: [
 *   { id: 'u1', status: 'sold_out', createdAt: 09:55 AM },
 *   { id: 'u2', status: 'sold_out', createdAt: 09:50 AM },
 *   { id: 'u3', status: 'sold_out', createdAt: 09:40 AM },
 *   { id: 'u4', status: 'low',      createdAt: 09:45 AM }
 * ]
 * -> Returns: status: 'sold_out', badgeType: 'crowd_confirmed',
 *             details: 'Confirmed by 3 people • updated 5m ago',
 *             secondaryNote: 'Organizer says: Available (updated 1h ago)'
 *
 * Example 4 (Crowd reports newer but < 3 agreeing users -> Unconfirmed):
 * Event: status = "available", statusSource = "organizer", statusUpdatedAt = 08:30 AM
 * Reports: [
 *   { id: 'u1', status: 'sold_out', createdAt: 09:55 AM },
 *   { id: 'u2', status: 'sold_out', createdAt: 09:50 AM }
 * ]
 * -> Returns: status: 'not_open', badgeType: 'unconfirmed', label: 'Unconfirmed',
 *             details: 'Unconfirmed • latest report 5m ago',
 *             secondaryNote: 'Organizer says: Available (updated 1h ago)'
 *
 * Example 5 (Expired crowd reports > 90 min):
 * Event: status = "available", statusSource = "organizer", statusUpdatedAt = 07:00 AM
 * Reports: [ { id: 'u1', status: 'sold_out', createdAt: 08:00 AM } ] (120 min ago)
 * -> Returns: fallback to organizer status 'available' with 'organizer_verified' badge.
 * --------------------------------------------------------------------------------
 */
export function computeDisplayedStatus(
  event: ConcertEvent,
  reports: CrowdReport[],
  currentTimeMs: number = Date.now()
): ComputedStatusResult {
  const verifiedDate = parseTimestampToDate(event.statusUpdatedAt);
  const verifiedTime = verifiedDate.getTime();
  const isOrganizer = event.statusSource === 'organizer';
  const isVerifiedSource = event.statusSource === 'admin' || event.statusSource === 'organizer';

  // Find newest report time (if any reports exist)
  let newestReportTime = 0;
  reports.forEach((r) => {
    const t = parseTimestampToDate(r.createdAt).getTime();
    if (t > newestReportTime) newestReportTime = t;
  });

  // Rule 2: Verified update (admin or organizer) is newer than the newest crowd report (or no reports exist)
  const isVerifiedNewer =
    isVerifiedSource && (reports.length === 0 || verifiedTime >= newestReportTime);

  if (isVerifiedNewer) {
    const baseConfig = STATUS_MAP[event.status] || STATUS_MAP.not_open;
    const badgeType: StatusBadgeType = isOrganizer ? 'organizer_verified' : 'admin_verified';
    const sourceLabel = isOrganizer ? 'Verified by organizer' : 'Admin Verified';

    return {
      status: event.status,
      badgeType,
      label: baseConfig.label,
      details: `${sourceLabel} • ${formatRelativeTime(event.statusUpdatedAt)}`,
      statusConfig: baseConfig,
    };
  }

  // Rule 3: Crowd reports are newer than verified update.
  // Filter reports strictly from the last 90 minutes.
  const windowStart = currentTimeMs - CROWD_REPORT_WINDOW_MS;
  const validReports = reports.filter((r) => {
    const t = parseTimestampToDate(r.createdAt).getTime();
    return t >= windowStart && t <= currentTimeMs;
  });

  // Helper for secondary note: "Organizer says: X (updated N min ago)"
  const officialLabel = STATUS_MAP[event.status]?.label || event.status;
  const officialSourceTitle = isOrganizer ? 'Organizer' : 'Admin';
  const secondaryNote = `${officialSourceTitle} says: ${officialLabel} (updated ${formatRelativeTime(event.statusUpdatedAt)})`;

  // If no reports fall within the last 90 minutes, fallback to base verified status
  if (validReports.length === 0) {
    const baseConfig = STATUS_MAP[event.status] || STATUS_MAP.not_open;
    const badgeType: StatusBadgeType = isOrganizer ? 'organizer_verified' : 'admin_verified';
    const sourceLabel = isOrganizer ? 'Verified by organizer' : 'Admin Verified';

    return {
      status: event.status,
      badgeType,
      label: baseConfig.label,
      details: `${sourceLabel} • ${formatRelativeTime(event.statusUpdatedAt)}`,
      statusConfig: baseConfig,
    };
  }

  // Group agreeing reports by status
  const counts: Record<CrowdReportStatus, number> = {
    available: 0,
    low: 0,
    sold_out: 0,
  };
  const newestTimeByStatus: Record<CrowdReportStatus, number> = {
    available: 0,
    low: 0,
    sold_out: 0,
  };

  validReports.forEach((r) => {
    if (r.status in counts) {
      counts[r.status] += 1;
      const t = parseTimestampToDate(r.createdAt).getTime();
      if (t > newestTimeByStatus[r.status]) {
        newestTimeByStatus[r.status] = t;
      }
    }
  });

  // Check if any status meets or exceeds the agreement threshold (>= 3)
  const candidates: CrowdReportStatus[] = (['sold_out', 'low', 'available'] as CrowdReportStatus[]).filter(
    (s) => counts[s] >= CROWD_AGREEMENT_THRESHOLD
  );

  if (candidates.length > 0) {
    // If multiple meet threshold, pick highest count, then newest report
    candidates.sort((a, b) => {
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return newestTimeByStatus[b] - newestTimeByStatus[a];
    });

    const agreedStatus = candidates[0];
    const agreedCount = counts[agreedStatus];
    const latestAgreedTime = newestTimeByStatus[agreedStatus];
    const baseConfig = STATUS_MAP[agreedStatus] || STATUS_MAP.available;

    return {
      status: agreedStatus,
      badgeType: 'crowd_confirmed',
      label: baseConfig.label,
      details: `Confirmed by ${agreedCount} people • ${formatRelativeTime(latestAgreedTime)}`,
      secondaryNote,
      agreementCount: agreedCount,
      statusConfig: baseConfig,
    };
  }

  // Rule 4: Fewer than 3 users agree -> Show "Unconfirmed" with neutral badge
  const unconfirmedConfig: StatusConfig = {
    label: 'Unconfirmed',
    labelTh: 'ยังไม่ยืนยัน',
    labelEn: 'Unconfirmed',
    symbol: '?',
    badgeClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    dotClass: 'bg-neutral-400',
    textColor: 'text-neutral-300',
    pinColor: '#71717a',
  };

  return {
    status: 'not_open',
    badgeType: 'unconfirmed',
    label: 'Unconfirmed',
    details: `Unconfirmed • latest report ${formatRelativeTime(newestReportTime)}`,
    secondaryNote,
    statusConfig: unconfirmedConfig,
  };
}
