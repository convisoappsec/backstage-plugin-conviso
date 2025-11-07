export function normalizeEntityName(name: string | undefined): string {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

