import { ConcertEvent, CrowdReport, EventStatus, CrowdReportStatus } from '../types/event';
import { STATUS_MAP, StatusConfig } from './statusUtils';
import { parseTimestampToDate, formatRelativeTime } from './dateUtils';

/**
 * Threshold constants for crowd-reported ticket status (Requirement 4)
 */
export const CROWD_REPORT_AGREEMENT_THRESHOLD = 3;
export const CROWD_REPORT_WINDOW_MS = 90 * 60 * 1000; // 90 minutes

export type DisplayedBadgeType =
  | 'admin_verified'
  | 'organizer_verified'
  | 'crowd_confirmed'
  | 'unconfirmed';

export interface DisplayedStatusResult {
  status: EventStatus;
  badgeType: DisplayedBadgeType;
  label: string;
  labelTh: string;
  labelEn: string;
  symbol: string;
  details: string;
  statusConfig: StatusConfig;
  agreementCount?: number;
}

/**
 * Computes the displayed ticket status for an event based on admin/organizer source
 * or crowd reports adhering to the 3-user and 90-minute thresholds.
 *
 * Unit-test-style examples:
 * 1. Admin status is newer than latest report -> returns admin verified status.
 * 2. No admin update, 3 users reported 'sold_out' within 90 min -> returns confirmed 'sold_out' with count.
 * 3. Only 2 users reported 'available' within 90 min -> returns neutral 'unconfirmed' status.
 */
export function computeDisplayedStatus(
  event: ConcertEvent,
  reports: CrowdReport[],
  currentTimeMs: number = Date.now()
): DisplayedStatusResult {
  const verifiedDate = parseTimestampToDate(event.statusUpdatedAt);
  const verifiedTime = verifiedDate.getTime();
  const isOrganizer = event.statusSource === 'organizer';
  const isVerifiedSource = event.statusSource === 'admin' || event.statusSource === 'organizer';

  // Find newest report time
  let newestReportTime = 0;
  reports.forEach((r) => {
    const t = parseTimestampToDate(r.createdAt).getTime();
    if (t > newestReportTime) newestReportTime = t;
  });

  // Rule 1: Admin or organizer status is newer than newest crowd report (or no reports)
  const isVerifiedNewer =
    isVerifiedSource && (reports.length === 0 || verifiedTime >= newestReportTime);

  if (isVerifiedNewer) {
    const baseConfig = STATUS_MAP[event.status] || STATUS_MAP.not_open;
    const badgeType: DisplayedBadgeType = isOrganizer ? 'organizer_verified' : 'admin_verified';
    const sourceLabel = isOrganizer ? 'Verified by organizer' : 'Verified by Admin';

    return {
      status: event.status,
      badgeType,
      label: baseConfig.label,
      labelTh: baseConfig.labelTh,
      labelEn: baseConfig.labelEn,
      symbol: baseConfig.symbol,
      details: `${sourceLabel} • ${formatRelativeTime(event.statusUpdatedAt)}`,
      statusConfig: baseConfig,
    };
  }

  // Rule 2: Crowd reports are newer. Filter reports from the last 90 minutes.
  const windowStart = currentTimeMs - CROWD_REPORT_WINDOW_MS;
  const validReports = reports.filter((r) => {
    const t = parseTimestampToDate(r.createdAt).getTime();
    return t >= windowStart && t <= currentTimeMs;
  });

  // Count agreements for each status
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
    if (counts[r.status] !== undefined) {
      counts[r.status]++;
      const t = parseTimestampToDate(r.createdAt).getTime();
      if (t > newestTimeByStatus[r.status]) {
        newestTimeByStatus[r.status] = t;
      }
    }
  });

  // Find candidate with max agreement >= CROWD_REPORT_AGREEMENT_THRESHOLD (3)
  const candidates = (Object.keys(counts) as CrowdReportStatus[]).filter(
    (st) => counts[st] >= CROWD_REPORT_AGREEMENT_THRESHOLD
  );

  if (candidates.length > 0) {
    // Sort by highest count, then newest report time
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
      labelTh: baseConfig.labelTh,
      labelEn: baseConfig.labelEn,
      symbol: baseConfig.symbol,
      details: `Confirmed by ${agreedCount} people • ${formatRelativeTime(latestAgreedTime)}`,
      agreementCount: agreedCount,
      statusConfig: baseConfig,
    };
  }

  // Rule 3: Fewer than 3 users agree -> Show neutral grey "Unconfirmed" badge
  const unconfirmedConfig: StatusConfig = {
    label: 'Unconfirmed',
    labelTh: 'ยังไม่ยืนยัน',
    labelEn: 'Unconfirmed',
    symbol: '?',
    badgeClass: 'bg-neutral-900 text-neutral-300 border-neutral-700',
    dotClass: 'bg-neutral-500',
    textColor: 'text-neutral-300',
    pinColor: '#71717a',
  };

  return {
    status: 'not_open',
    badgeType: 'unconfirmed',
    label: 'Unconfirmed',
    labelTh: 'ยังไม่ยืนยัน',
    labelEn: 'Unconfirmed',
    symbol: '?',
    details: `Unconfirmed • latest report ${formatRelativeTime(newestReportTime || currentTimeMs)}`,
    statusConfig: unconfirmedConfig,
  };
}
