export const SizeFormatter = {
  maxNoteBytes: 50 * 1024 * 1024, // 50 MB

  formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  },

  parseSizeToBytes(raw?: string | null): number {
    if (!raw || !raw.trim()) return 0;
    const match = raw.trim().match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
    if (!match) return 0;
    const value = parseFloat(match[1] || '0') || 0;
    const unit = (match[2] || 'B').toUpperCase();
    switch (unit) {
      case 'GB':
        return Math.round(value * 1024 * 1024 * 1024);
      case 'MB':
        return Math.round(value * 1024 * 1024);
      case 'KB':
        return Math.round(value * 1024);
      default:
        return Math.round(value);
    }
  },

  formatBytesToMB(bytes: number): string {
    if (bytes <= 0) return '0 MB';
    return SizeFormatter.formatBytes(bytes);
  },

  sanitizeStorageKey(originalFileName: string): string {
    const safeName = originalFileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    const rand = Math.floor(Math.random() * 999999);
    return `note-${Date.now()}-${rand}-${safeName}`;
  },

  slugify(input: string): string {
    const base = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || `item-${Date.now()}`;
  },
};
