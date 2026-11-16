import { ConsultantSubmittalKpi } from '../types';

export function isRfiRecord(item: Partial<ConsultantSubmittalKpi> | null | undefined): boolean {
  if (!item) return false;
  const normalizedType = String(item.type || '').trim().toLowerCase();
  if (normalizedType === 'rfi' || normalizedType === 'request for information') {
    return true;
  }
  const normalizedId = String(item.id || '').trim().toLowerCase();
  if (normalizedId.startsWith('rfi_')) {
    return true;
  }
  const normalizedNo = String(item.submittalNo || '').trim();
  if (/^rfi[-_\s#0-9]/i.test(normalizedNo) || /^rfi$/i.test(normalizedNo)) {
    return true;
  }
  if (
    Boolean(item.rfiStatus && String(item.rfiStatus).trim().length > 0) ||
    Boolean(item.contractorInquiry && String(item.contractorInquiry).trim().length > 0) ||
    Boolean(item.correspondenceThread && item.correspondenceThread.length > 0)
  ) {
    return true;
  }
  return false;
}

export function deduplicateSubmittals(list: ConsultantSubmittalKpi[]): ConsultantSubmittalKpi[] {
  const seenIds = new Set<string>();
  const seenScopeNos = new Set<string>();
  const result: ConsultantSubmittalKpi[] = [];

  for (const item of list) {
    if (!item) continue;
    const normId = String(item.id || '').trim();
    if (normId && seenIds.has(normId)) {
      continue;
    }

    const isRfi = isRfiRecord(item);
    const normNo = String(item.submittalNo || '').trim().toUpperCase();
    const scopeKey = normNo ? `${isRfi ? 'RFI' : 'TECH'}::${normNo}` : '';
    if (scopeKey && seenScopeNos.has(scopeKey)) {
      continue;
    }

    if (normId) seenIds.add(normId);
    if (scopeKey) seenScopeNos.add(scopeKey);

    result.push(isRfi && item.type !== 'RFI' ? { ...item, type: 'RFI' } : item);
  }

  return result;
}

export function isSubmittalApproved(status?: string): boolean {
  const s = String(status || '').trim().toLowerCase();
  return (
    s === 'approved' ||
    s === 'closed' ||
    s === 'approved with comment' ||
    s === 'approved with comments' ||
    s === 'approved / closed'
  );
}

export function isSubmittalRejected(status?: string): boolean {
  const s = String(status || '').trim().toLowerCase();
  return s === 'rejected' || s === 'revise and resubmit' || s === 'resubmit';
}
