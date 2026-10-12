import { User, UserSignInRecord } from '../types';

const DEVICE_ID_KEY = 'era_device_id';

/**
 * Retrieves or initializes a unique persistent hardware/browser client ID for this device.
 */
export function getCurrentDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device';
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'fallback_device_id';
  }
}

/**
 * Detects operating system and browser summary for telemetry and audit display.
 */
export function getDeviceSummary(): string {
  if (typeof window === 'undefined' || !navigator) return 'Web Client';
  const ua = navigator.userAgent || '';
  let device = 'Desktop PC';
  if (/iPad/.test(ua)) device = 'iPad Tablet';
  else if (/iPhone|iPod/.test(ua)) device = 'iOS Mobile Device';
  else if (/android/i.test(ua)) device = 'Android Mobile';
  else if (/Macintosh/i.test(ua)) device = 'macOS Workstation';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Linux/i.test(ua)) device = 'Linux Workstation';
  else if (/CrOS/i.test(ua)) device = 'Chromebook';

  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  return `${device} • ${browser}`;
}

/**
 * Returns current timezone and language location summary.
 */
export function getLocationSummary(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Addis_Ababa';
    const lang = (navigator && navigator.language) || 'en';
    return `${tz} (${lang.toUpperCase()})`;
  } catch {
    return 'Africa/Addis_Ababa (EN)';
  }
}

/**
 * Generates a fresh sign-in record for the current device session.
 */
export function createCurrentSignInRecord(): UserSignInRecord {
  const currentDeviceId = getCurrentDeviceId();
  return {
    id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    deviceId: currentDeviceId,
    deviceInfo: getDeviceSummary(),
    location: getLocationSummary(),
    ipAddress: '196.188.42.118 (ERA GovNet)',
    signedInAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    isCurrentDevice: true
  };
}

/**
 * Seed sample field devices if a user has only their current device,
 * allowing instant demonstration and verification of cross-device session removal.
 */
export function getSampleOtherDeviceRecords(): UserSignInRecord[] {
  const now = Date.now();
  return [
    {
      id: 'sess_field_tablet_01',
      deviceId: 'dev_ipad_pro_hawassa',
      deviceInfo: 'iPad Tablet • Mobile Safari',
      location: 'Africa/Addis_Ababa (EN) — Hawassa PMO Site Office',
      ipAddress: '196.188.102.45 (Site HQ Wireless)',
      signedInAt: new Date(now - 86400000 * 2.5).toISOString(), // 2.5 days ago
      lastActiveAt: new Date(now - 3600000 * 4).toISOString(), // 4 hours ago
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      isCurrentDevice: false
    },
    {
      id: 'sess_field_mobile_02',
      deviceId: 'dev_android_mobile_field',
      deviceInfo: 'Android Mobile • Chrome',
      location: 'Africa/Addis_Ababa (EN) — Section 2 Inspection Vehicle',
      ipAddress: '197.156.78.204 (Ethio Telecom 4G)',
      signedInAt: new Date(now - 86400000 * 5).toISOString(), // 5 days ago
      lastActiveAt: new Date(now - 86400000 * 1.2).toISOString(), // 1.2 days ago
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
      isCurrentDevice: false
    }
  ];
}

/**
 * Ensures the given user object has up-to-date sign-in records for the current device,
 * and attaches demo other-device records if this user has no record history yet.
 */
export function ensureUserSignInRecords(user: User): User {
  if (!user) return user;
  const currentDeviceId = getCurrentDeviceId();
  let existingRecords: UserSignInRecord[] = Array.isArray(user.signInRecords) ? [...user.signInRecords] : [];

  const currentIndex = existingRecords.findIndex(r => r.deviceId === currentDeviceId);

  if (currentIndex >= 0) {
    // Update existing session for this device
    existingRecords[currentIndex] = {
      ...existingRecords[currentIndex],
      lastActiveAt: new Date().toISOString(),
      deviceInfo: getDeviceSummary(),
      location: getLocationSummary()
    };
  } else {
    // Append current device session
    existingRecords.unshift(createCurrentSignInRecord());
  }

  // If there is only the current device and no records were previously purged, seed other device records for realistic multi-device session management
  const wasPurged = localStorage.getItem(`era_purged_devices_${user.username.toLowerCase()}`) === 'true';
  if (existingRecords.length === 1 && !wasPurged) {
    existingRecords = [...existingRecords, ...getSampleOtherDeviceRecords()];
  }

  return {
    ...user,
    signInRecords: existingRecords
  };
}

/**
 * Removes all device sign-in records except the one belonging to currentDeviceId.
 */
export function removeOtherDeviceRecords(user: User, currentDeviceId: string): User {
  if (!user) return user;
  const records = Array.isArray(user.signInRecords) ? user.signInRecords : [];
  
  // Retain only current device record
  let retained = records.filter(r => r.deviceId === currentDeviceId);
  if (retained.length === 0) {
    retained = [createCurrentSignInRecord()];
  } else {
    // Refresh lastActiveAt for the retained record
    retained = retained.map(r => ({
      ...r,
      lastActiveAt: new Date().toISOString()
    }));
  }

  try {
    localStorage.setItem(`era_purged_devices_${user.username.toLowerCase()}`, 'true');
  } catch {}

  return {
    ...user,
    signInRecords: retained
  };
}

/**
 * Removes a specific device sign-in record by record ID.
 */
export function removeSpecificDeviceRecord(user: User, recordId: string): User {
  if (!user) return user;
  const records = Array.isArray(user.signInRecords) ? user.signInRecords : [];
  const updatedRecords = records.filter(r => r.id !== recordId);

  return {
    ...user,
    signInRecords: updatedRecords
  };
}
