import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Database,
  FileClock,
  FolderClosed,
  Gauge,
  KeyRound,
  MailPlus,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { useEntitlements } from '../hooks/useEntitlements.ts';
import { useSubscription } from '../hooks/useSubscription.ts';
import { ensureFreshSession, getAuthenticatedHeaders } from '../services/apiClient.ts';
import type { EnergyRecord, Facility, Organisation, User, ViewState } from '../types.ts';
import { hasAdminAccess } from '../utils/adminAccess.ts';

interface RoleOption { id: string; name: string; description?: string }
interface Membership {
  id: string;
  user_id: string;
  role_id: string;
  created_at?: string;
  email?: string;
  roles?: { name?: string } | { name?: string }[];
  profile?: { full_name?: string; status?: string; last_login_at?: string | null } | null;
}
interface Invitation {
  id: string;
  email: string;
  role_id: string;
  status: string;
  expires_at: string;
  roles?: { name?: string } | { name?: string }[];
}
interface AuditEvent { id: string; event_type: string; created_at: string; metadata?: Record<string, unknown> }

interface AdminDashboardProps {
  user: User | null;
  organisation: Organisation | null;
  facilities: Facility[];
  records: EnergyRecord[];
  documentsCount: number;
  reportsCount: number;
  onNavigate: (view: ViewState) => void;
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  await ensureFreshSession();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthenticatedHeaders(options?.headers),
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'The request could not be completed.');
  return payload as T;
}

function relatedName(value: Membership['roles'] | Invitation['roles']) {
  if (Array.isArray(value)) return value[0]?.name || 'Unassigned';
  return value?.name || 'Unassigned';
}

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function AdminDashboard({
  user,
  organisation,
  facilities,
  records,
  documentsCount,
  reportsCount,
  onNavigate,
}: AdminDashboardProps) {
  const allowed = hasAdminAccess(user?.role);
  const { subscription, usage, loading: subscriptionLoading } = useSubscription();
  const { limits, license } = useEntitlements();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [auditAvailable, setAuditAvailable] = useState(true);

  const loadAdminData = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    const results = await Promise.allSettled([
      requestJson<{ memberships: Membership[] }>('/api/auth/memberships'),
      requestJson<{ invitations: Invitation[] }>('/api/auth/invitations'),
      requestJson<{ roles: RoleOption[] }>('/api/auth/role-catalog'),
      requestJson<{ events: AuditEvent[] }>('/api/auth/audit-events'),
      requestJson<{ status: string }>('/api/health'),
    ]);

    if (results[0].status === 'fulfilled') setMemberships(results[0].value.memberships ?? []);
    if (results[1].status === 'fulfilled') setInvitations(results[1].value.invitations ?? []);
    if (results[2].status === 'fulfilled') {
      const nextRoles = results[2].value.roles ?? [];
      setRoles(nextRoles);
      setInviteRoleId((current) => current || nextRoles.find((role) => role.id === 'role-sustainability-manager')?.id || nextRoles[0]?.id || '');
    }
    if (results[3].status === 'fulfilled') setAuditEvents(results[3].value.events ?? []);
    else setAuditAvailable(false);
    setApiHealthy(results[4].status === 'fulfilled' && results[4].value.status === 'ok');

    const requiredFailure = results.slice(0, 3).find((result) => result.status === 'rejected');
    if (requiredFailure?.status === 'rejected') setMessage({ type: 'error', text: requiredFailure.reason instanceof Error ? requiredFailure.reason.message : 'Some admin data could not be loaded.' });
    setLoading(false);
  }, [allowed]);

  useEffect(() => { void loadAdminData(); }, [loadAdminData]);

  const activeInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === 'pending' && new Date(invitation.expires_at).getTime() > Date.now()),
    [invitations],
  );

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteEmail.trim() || !inviteRoleId) return;
    setBusyId('invite');
    setMessage(null);
    try {
      await requestJson('/api/auth/invitations', { method: 'POST', body: JSON.stringify({ email: inviteEmail.trim(), roleId: inviteRoleId }) });
      setInviteEmail('');
      setMessage({ type: 'success', text: 'Invitation created. It will remain valid for seven days.' });
      await loadAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to create the invitation.' });
    } finally { setBusyId(''); }
  };

  const changeRole = async (membershipId: string, roleId: string) => {
    setBusyId(membershipId);
    setMessage(null);
    try {
      await requestJson(`/api/auth/memberships/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ roleId }) });
      setMessage({ type: 'success', text: 'Member role updated.' });
      await loadAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to update the role.' });
    } finally { setBusyId(''); }
  };

  const removeMember = async (membership: Membership) => {
    if (!window.confirm(`Remove ${membership.profile?.full_name || membership.email || 'this member'} from the organisation?`)) return;
    setBusyId(membership.id);
    setMessage(null);
    try {
      await requestJson(`/api/auth/memberships/${membership.id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Member removed from the organisation.' });
      await loadAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to remove the member.' });
    } finally { setBusyId(''); }
  };

  const revokeInvitation = async (invitation: Invitation) => {
    setBusyId(invitation.id);
    setMessage(null);
    try {
      await requestJson(`/api/auth/invitations/${invitation.id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: `Invitation for ${invitation.email} revoked.` });
      await loadAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to revoke the invitation.' });
    } finally { setBusyId(''); }
  };

  if (!allowed) {
    return (
      <section className="min-h-[55vh] bg-white border border-brand-border rounded-lg flex flex-col items-center justify-center text-center p-8">
        <ShieldCheck className="w-10 h-10 text-brand-forest" />
        <h2 className="text-xl font-black mt-4">Administrator access required</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-lg">This workspace contains organisation, access, subscription, and security controls. Ask an organisation administrator to make changes for you.</p>
        <button type="button" onClick={() => onNavigate('dashboard-overview')} className="mt-5 px-4 py-2 bg-brand-charcoal text-white rounded text-sm font-bold">Return to overview</button>
      </section>
    );
  }

  const statCards = [
    { label: 'Team members', value: loading ? '...' : memberships.length, detail: `${activeInvitations.length} pending invitation${activeInvitations.length === 1 ? '' : 's'}`, icon: Users },
    { label: 'Facilities', value: facilities.length, detail: `${records.length} activity records`, icon: Building2 },
    { label: 'Current plan', value: subscriptionLoading ? '...' : subscription?.plan?.name || 'Not configured', detail: `${subscription?.status || 'Unknown'} subscription`, icon: Gauge },
    { label: 'Platform health', value: apiHealthy === null ? 'Checking' : apiHealthy ? 'Operational' : 'Needs attention', detail: license?.status ? `${license.status} license` : 'License not configured', icon: Server },
  ];

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <section className="bg-brand-charcoal text-white rounded-lg px-5 sm:px-7 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase text-brand-sage tracking-widest">Organisation administration</p>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">{organisation?.name || 'Admin Console'}</h2>
          <p className="text-sm text-white/65 mt-2 max-w-2xl">Manage people, access, data governance, platform health, and subscription controls from one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate('dashboard-company')} className="px-4 py-2 bg-white text-brand-charcoal rounded text-xs font-bold flex items-center gap-2"><Building2 className="w-4 h-4" /> Organisation profile</button>
          <button type="button" onClick={() => onNavigate('dashboard-settings')} className="px-4 py-2 border border-white/25 rounded text-xs font-bold flex items-center gap-2"><Settings className="w-4 h-4" /> Plan & settings</button>
        </div>
      </section>

      {message && (
        <div role="status" className={`border rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-brand-sage/40 border-brand-sage text-brand-forest' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Administration summary">
        {statCards.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="bg-white border border-brand-border rounded-lg p-5 min-h-32">
            <div className="flex items-start justify-between gap-3"><p className="text-[10px] font-mono uppercase text-gray-400">{label}</p><Icon className="w-4 h-4 text-brand-forest" /></div>
            <p className="text-2xl font-black mt-4 truncate">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{detail}</p>
          </div>
        ))}
      </section>

      <section className="grid xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)] gap-6 items-start">
        <div className="bg-white border border-brand-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><h3 className="font-black flex items-center gap-2"><UserCog className="w-4 h-4 text-brand-forest" /> People & access</h3><p className="text-xs text-gray-500 mt-1">Invite users and assign their organisation role.</p></div>
            <button type="button" onClick={() => void loadAdminData()} disabled={loading} title="Refresh people and access" className="w-9 h-9 border border-brand-border rounded flex items-center justify-center hover:bg-brand-offwhite disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>

          <form onSubmit={inviteMember} className="p-5 border-b border-brand-border grid md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3">
            <label className="text-xs font-bold">Email address<input type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" className="block w-full h-10 mt-2 px-3 border border-brand-border rounded bg-brand-offwhite outline-none focus:border-brand-forest font-normal" /></label>
            <label className="text-xs font-bold">Role<select required value={inviteRoleId} onChange={(event) => setInviteRoleId(event.target.value)} className="block w-full h-10 mt-2 px-3 border border-brand-border rounded bg-brand-offwhite outline-none focus:border-brand-forest font-normal">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <button type="submit" disabled={busyId === 'invite' || !roles.length} className="h-10 md:self-end px-4 bg-brand-forest text-white rounded text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"><MailPlus className="w-4 h-4" /> Invite</button>
          </form>

          <div className="divide-y divide-brand-border">
            {memberships.map((membership) => (
              <div key={membership.id} className="px-5 py-4 grid sm:grid-cols-[minmax(0,1fr)_210px_auto] gap-3 sm:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{membership.profile?.full_name || membership.email || 'Organisation member'}{membership.user_id === user?.id && <span className="ml-2 text-[9px] font-mono uppercase bg-brand-sage text-brand-forest px-1.5 py-0.5 rounded">You</span>}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{membership.email || membership.user_id}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Last sign in: {formatDate(membership.profile?.last_login_at)}</p>
                </div>
                <label className="sr-only" htmlFor={`role-${membership.id}`}>Role for {membership.profile?.full_name || membership.email}</label>
                <select id={`role-${membership.id}`} value={membership.role_id} onChange={(event) => void changeRole(membership.id, event.target.value)} disabled={busyId === membership.id} className="h-9 px-2 border border-brand-border rounded bg-brand-offwhite text-xs outline-none focus:border-brand-forest disabled:opacity-50">
                  {!roles.some((role) => role.id === membership.role_id) && <option value={membership.role_id}>{relatedName(membership.roles)}</option>}
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
                <button type="button" onClick={() => void removeMember(membership)} disabled={membership.user_id === user?.id || busyId === membership.id} title={membership.user_id === user?.id ? 'You cannot remove your own membership' : 'Remove member'} className="w-9 h-9 border border-brand-border rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {!loading && !memberships.length && <p className="p-5 text-sm text-gray-500">No organisation members were returned.</p>}
          </div>

          {activeInvitations.length > 0 && <div className="border-t border-brand-border"><p className="px-5 pt-4 text-[10px] font-mono uppercase text-gray-400">Pending invitations</p>{activeInvitations.map((invitation) => <div key={invitation.id} className="px-5 py-3 flex items-center gap-3"><MailPlus className="w-4 h-4 text-brand-forest shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{invitation.email}</p><p className="text-[10px] text-gray-400">{relatedName(invitation.roles)} · expires {formatDate(invitation.expires_at)}</p></div><button type="button" onClick={() => void revokeInvitation(invitation)} disabled={busyId === invitation.id} className="text-xs font-bold text-red-600 disabled:opacity-50">Revoke</button></div>)}</div>}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-brand-border rounded-lg p-5">
            <h3 className="font-black flex items-center gap-2"><Gauge className="w-4 h-4 text-brand-forest" /> Plan usage</h3>
            <p className="text-xs text-gray-500 mt-1">{subscription?.plan?.name || 'No plan configured'} · {subscription?.billingInterval || 'monthly'}</p>
            <div className="mt-4 space-y-4">
              {limits.filter((limit: any) => ['facilities', 'users', 'reports_month', 'storage_gb'].includes(limit.key)).map((limit: any) => {
                const current = Number(limit.current ?? usage?.[limit.key === 'reports_month' ? 'reportsGenerated' : limit.key === 'storage_gb' ? 'storageGb' : limit.key] ?? 0);
                const maximum = Number(limit.maximum ?? 0);
                const percentage = maximum > 0 ? Math.min(100, current / maximum * 100) : 0;
                return <div key={limit.key}><div className="flex justify-between text-xs"><span className="capitalize">{limit.key.replaceAll('_', ' ')}</span><span className="font-bold">{current} / {limit.displayValue ?? (maximum || 'Custom')}</span></div><div className="h-1.5 bg-brand-offwhite mt-2"><div className="h-full bg-brand-forest" style={{ width: `${percentage}%` }} /></div></div>;
              })}
              {!limits.length && <p className="text-xs text-gray-400">Plan limits will appear after subscription data is configured.</p>}
            </div>
            <button type="button" onClick={() => onNavigate('dashboard-settings')} className="mt-5 w-full h-10 border border-brand-border rounded text-xs font-bold hover:bg-brand-offwhite">Manage plan and settings</button>
          </div>

          <div className="bg-white border border-brand-border rounded-lg p-5">
            <h3 className="font-black flex items-center gap-2"><Activity className="w-4 h-4 text-brand-forest" /> Security activity</h3>
            <div className="mt-4 divide-y divide-brand-border">
              {auditEvents.slice(0, 5).map((event) => <div key={event.id} className="py-3"><p className="text-xs font-bold">{event.event_type.replaceAll('_', ' ')}</p><p className="text-[10px] text-gray-400 mt-1">{formatDate(event.created_at)}</p></div>)}
              {auditAvailable && !auditEvents.length && <p className="py-3 text-xs text-gray-400">No recent security events.</p>}
              {!auditAvailable && <p className="py-3 text-xs text-gray-400">Audit history is not included in the current entitlement.</p>}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4 mb-3"><div><h3 className="font-black">Governance workspaces</h3><p className="text-xs text-gray-500 mt-1">Direct access to the controls administrators use most.</p></div><p className="hidden sm:block text-[10px] font-mono text-gray-400">{documentsCount} documents · {reportsCount} reports</p></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { title: 'Data Hub', description: 'Imports, connectors and staging controls', icon: Database, view: 'dashboard-data-platform' as ViewState },
            { title: 'Metadata Studio', description: 'Templates, fields and governed forms', icon: KeyRound, view: 'dashboard-metadata' as ViewState },
            { title: 'Document Vault', description: `${documentsCount} evidence documents`, icon: FolderClosed, view: 'dashboard-documents' as ViewState },
            { title: 'Reporting Studio', description: `${reportsCount} generated reports`, icon: FileClock, view: 'dashboard-reports' as ViewState },
          ].map(({ title, description, icon: Icon, view }) => <button type="button" key={title} onClick={() => onNavigate(view)} className="bg-white border border-brand-border rounded-lg p-5 text-left hover:border-brand-forest hover:shadow-sm transition"><Icon className="w-5 h-5 text-brand-forest" /><span className="block font-black mt-4">{title}</span><span className="block text-xs text-gray-500 mt-1">{description}</span></button>)}
        </div>
      </section>
    </div>
  );
}
