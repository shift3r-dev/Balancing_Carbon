import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from './supabaseClients.js';

export interface AuthorizationContext {
  userId: string;
  organisationId: string;
  roles: string[];
  permissions: string[];
}

export async function getAuthorizationContext(userId: string): Promise<AuthorizationContext> {
  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('organisation_id').eq('id', userId).single();
  if (profileError || !profile) throw new Error('Profile lookup failed.');
  const { data: memberships, error } = await supabaseAdmin
    .from('user_roles')
    .select('role_id, roles(name, role_permissions(permissions(key)))')
    .eq('user_id', userId)
    .eq('organisation_id', profile.organisation_id)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  const roles = (memberships ?? []).map((row: any) => row.roles?.name).filter(Boolean);
  const permissions = [...new Set((memberships ?? []).flatMap((row: any) => (row.roles?.role_permissions ?? []).map((link: any) => link.permissions?.key).filter(Boolean)))];
  return { userId, organisationId: profile.organisation_id, roles, permissions };
}

export async function auditAuthEvent(input: { userId?: string; organisationId?: string; eventType: string; metadata?: Record<string, unknown>; ipAddress?: string; userAgent?: string }) {
  await supabaseAdmin.from('auth_events').insert({ id: `auth-${randomUUID()}`, user_id: input.userId ?? null, organisation_id: input.organisationId ?? null, event_type: input.eventType, metadata: input.metadata ?? {}, ip_address: input.ipAddress ?? null, user_agent: input.userAgent ?? null });
}
