export function parsePhoneList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((entry) => normalizeHandle(entry)).filter(Boolean))];
}

export function digestRecipients(): string[] {
  return parsePhoneList(process.env.IMESSAGE_RECIPIENTS ?? process.env.IMESSAGE_RECIPIENT);
}

export function isAllowedSender(handle: string | undefined): boolean {
  if (!handle) return false;
  const raw = process.env.IMESSAGE_ALLOW_FROM;
  if (raw?.trim() === '*') return true;
  const allowList = parsePhoneList(raw ?? process.env.IMESSAGE_RECIPIENTS ?? process.env.IMESSAGE_RECIPIENT);
  return allowList.includes(normalizeHandle(handle));
}

export function normalizeHandle(handle: string): string {
  const trimmed = handle.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (trimmed.startsWith('+') && digits.length > 0) return `+${digits}`;
  return trimmed;
}
