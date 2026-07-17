export function hasAdminAccess(role?: string | null) {
  const normalized = String(role ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return new Set([
    'admin',
    'superadmin',
    'platformadmin',
    'organisationadmin',
    'organizationadmin',
  ]).has(normalized);
}

export function hasPlatformAdminAccess(role?: string | null) {
  const normalized = String(role ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return normalized === 'superadmin' || normalized === 'platformadmin';
}
