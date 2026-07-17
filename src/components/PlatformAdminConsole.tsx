import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Factory,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { ensureFreshSession, getAuthenticatedHeaders } from '../services/apiClient.ts';
import type { User, ViewState } from '../types.ts';
import { hasPlatformAdminAccess } from '../utils/adminAccess.ts';
import PricingAdminPanel from './PricingAdminPanel.tsx';

interface Customer {
  id: string;
  name: string;
  industry: string;
  location: string;
  createdAt: string;
  members: number;
  facilities: number;
  activityRecords: number;
  subscriptionStatus: string;
  billingInterval?: string | null;
  renewalAt?: string | null;
  planId?: string | null;
  planName: string;
  licenseStatus: string;
  licenseReadOnly: boolean;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  organisationId: string;
  organisationName: string;
  roles: string[];
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
  emailConfirmed: boolean;
}

interface Plan { id: string; name: string; active?: boolean }
interface AuditEvent { id: string; event_type: string; organisation_id?: string | null; created_at: string }
interface Overview {
  summary: { organisations: number; activeCustomers: number; suspendedCustomers: number; users: number; facilities: number; activityRecords: number };
  recentOrganisations: Customer[];
  recentEvents: AuditEvent[];
}

interface PlatformAdminConsoleProps {
  user: User | null;
  onNavigate: (view: ViewState) => void;
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  await ensureFreshSession();
  const response = await fetch(url, {
    ...options,
    headers: { ...getAuthenticatedHeaders(options?.headers), 'Content-Type': 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'The request could not be completed.');
  return payload as T;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function statusTone(status: string) {
  if (['active', 'trial'].includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['suspended', 'cancelled', 'expired'].includes(status)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

export default function PlatformAdminConsole({ user, onNavigate }: PlatformAdminConsoleProps) {
  const allowed = hasPlatformAdminAccess(user?.role);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'users' | 'pricing'>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planDrafts, setPlanDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      const [overviewData, customerData, userData, planData] = await Promise.all([
        requestJson<Overview>('/api/platform-admin/overview'),
        requestJson<{ organisations: Customer[] }>('/api/platform-admin/organisations'),
        requestJson<{ users: PlatformUser[] }>('/api/platform-admin/users'),
        requestJson<{ plans: Plan[] }>('/api/plans'),
      ]);
      setOverview(overviewData);
      setCustomers(customerData.organisations ?? []);
      setUsers(userData.users ?? []);
      setPlans(planData.plans ?? []);
      setPlanDrafts(Object.fromEntries((customerData.organisations ?? []).map((customer) => [customer.id, customer.planId ?? ''])));
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load platform administration data.' });
    } finally { setLoading(false); }
  }, [allowed]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch = !normalized || `${customer.name} ${customer.industry} ${customer.location} ${customer.id}`.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? ['active', 'trial'].includes(customer.subscriptionStatus) : customer.subscriptionStatus === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [customers, query, statusFilter]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((platformUser) => {
      const matchesSearch = !normalized || `${platformUser.name} ${platformUser.email} ${platformUser.organisationName} ${platformUser.roles.join(' ')}`.toLowerCase().includes(normalized);
      return matchesSearch && (statusFilter === 'all' || platformUser.status === statusFilter);
    });
  }, [query, statusFilter, users]);

  const updateCustomer = async (customer: Customer, input: { status?: string; planId?: string }) => {
    const action = input.status === 'suspended' ? 'suspend' : input.status === 'active' ? 'reactivate' : 'change the plan for';
    if (!window.confirm(`Confirm that you want to ${action} ${customer.name}?`)) return;
    setBusyId(customer.id);
    setMessage(null);
    try {
      await requestJson(`/api/platform-admin/organisations/${customer.id}`, { method: 'PATCH', body: JSON.stringify(input) });
      setMessage({ type: 'success', text: `${customer.name} was updated.` });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to update this customer.' });
    } finally { setBusyId(''); }
  };

  const updateUserStatus = async (platformUser: PlatformUser, status: 'active' | 'suspended') => {
    const action = status === 'suspended' ? 'suspend' : 'reactivate';
    if (!window.confirm(`Confirm that you want to ${action} ${platformUser.name || platformUser.email}?`)) return;
    setBusyId(platformUser.id);
    setMessage(null);
    try {
      await requestJson(`/api/platform-admin/users/${platformUser.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setMessage({ type: 'success', text: `${platformUser.name || platformUser.email} was ${status === 'active' ? 'reactivated' : 'suspended'}.` });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to update this user.' });
    } finally { setBusyId(''); }
  };

  if (!allowed) return (
    <section className="min-h-[55vh] bg-white border border-brand-border rounded-lg flex flex-col items-center justify-center text-center p-8">
      <ShieldCheck className="w-10 h-10 text-brand-forest" />
      <h2 className="text-xl font-black mt-4">Platform administrator access required</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-lg">Customer and global user administration is restricted to Balancing Carbon platform administrators.</p>
      <button type="button" onClick={() => onNavigate('dashboard-overview')} className="mt-5 px-4 py-2 bg-brand-charcoal text-white rounded text-sm font-bold">Return to overview</button>
    </section>
  );

  const summaryCards = [
    { label: 'Customer organisations', value: overview?.summary.organisations ?? 0, detail: `${overview?.summary.activeCustomers ?? 0} active`, icon: Building2 },
    { label: 'Platform users', value: overview?.summary.users ?? 0, detail: `${overview?.summary.suspendedCustomers ?? 0} suspended customers`, icon: Users },
    { label: 'Managed facilities', value: overview?.summary.facilities ?? 0, detail: 'Across all customers', icon: Factory },
    { label: 'Activity records', value: overview?.summary.activityRecords ?? 0, detail: 'Global governed data volume', icon: Activity },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <section className="bg-brand-charcoal text-white rounded-lg px-5 sm:px-7 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div><p className="text-[10px] font-mono uppercase text-brand-sage tracking-widest">Balancing Carbon operations</p><h2 className="text-2xl sm:text-3xl font-black mt-2">Platform Admin Console</h2><p className="text-sm text-white/65 mt-2 max-w-2xl">Manage customer accounts, global users, plans, licenses, and platform access.</p></div>
        <button type="button" onClick={() => void loadData()} disabled={loading} className="h-10 px-4 bg-white text-brand-charcoal rounded text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh platform data</button>
      </section>

      {message && <div role="status" className={`border rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-brand-sage/40 border-brand-sage text-brand-forest' : 'bg-red-50 border-red-200 text-red-700'}`}>{message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message.text}</div>}

      <nav className="bg-white border border-brand-border rounded-lg p-1 flex overflow-x-auto" aria-label="Platform administration views">
        {(['overview', 'customers', 'users', 'pricing'] as const).map((tab) => <button key={tab} type="button" onClick={() => { setActiveTab(tab); setQuery(''); setStatusFilter('all'); }} className={`min-w-32 px-4 py-2.5 rounded text-xs font-bold capitalize ${activeTab === tab ? 'bg-brand-charcoal text-white' : 'text-gray-500 hover:bg-brand-offwhite'}`}>{tab}</button>)}
      </nav>

      {activeTab === 'overview' && <>
        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{summaryCards.map(({ label, value, detail, icon: Icon }) => <div key={label} className="bg-white border border-brand-border rounded-lg p-5 min-h-32"><div className="flex justify-between"><p className="text-[10px] font-mono uppercase text-gray-400">{label}</p><Icon className="w-4 h-4 text-brand-forest" /></div><p className="text-3xl font-black mt-4">{loading ? '...' : value}</p><p className="text-xs text-gray-500 mt-1">{detail}</p></div>)}</section>
        <section className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-6 items-start">
          <div className="bg-white border border-brand-border rounded-lg overflow-hidden"><div className="p-5 border-b border-brand-border"><h3 className="font-black">Recently added customers</h3></div><div className="divide-y divide-brand-border">{overview?.recentOrganisations.map((customer) => <button type="button" key={customer.id} onClick={() => { setActiveTab('customers'); setQuery(customer.name); }} className="w-full p-5 flex items-center gap-4 text-left hover:bg-brand-offwhite"><div className="w-10 h-10 rounded bg-brand-sage flex items-center justify-center"><Building2 className="w-4 h-4 text-brand-forest" /></div><div className="min-w-0 flex-1"><p className="font-bold text-sm truncate">{customer.name}</p><p className="text-xs text-gray-500 mt-0.5 truncate">{customer.planName} · {customer.members} users · {customer.facilities} facilities</p></div><span className={`text-[9px] font-mono uppercase border rounded px-2 py-1 ${statusTone(customer.subscriptionStatus)}`}>{customer.subscriptionStatus}</span></button>)}{!overview?.recentOrganisations.length && <p className="p-5 text-sm text-gray-400">No customer organisations found.</p>}</div></div>
          <div className="bg-white border border-brand-border rounded-lg p-5"><h3 className="font-black">Recent platform activity</h3><div className="mt-3 divide-y divide-brand-border">{overview?.recentEvents.slice(0, 10).map((event) => <div key={event.id} className="py-3"><p className="text-xs font-bold capitalize">{event.event_type.replaceAll('_', ' ')}</p><p className="text-[10px] text-gray-400 mt-1">{formatDate(event.created_at)}{event.organisation_id ? ` · ${event.organisation_id}` : ''}</p></div>)}{!overview?.recentEvents.length && <p className="py-3 text-xs text-gray-400">No recent platform events.</p>}</div></div>
        </section>
      </>}

      {activeTab !== 'overview' && activeTab !== 'pricing' && <section className="bg-white border border-brand-border rounded-lg p-4 flex flex-col md:flex-row gap-3"><label className="relative flex-1"><span className="sr-only">Search {activeTab}</span><Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeTab === 'customers' ? 'Search company, industry, location or ID' : 'Search user, email, company or role'} className="w-full h-10 pl-10 pr-3 bg-brand-offwhite border border-brand-border rounded text-sm outline-none focus:border-brand-forest" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 min-w-44 px-3 bg-brand-offwhite border border-brand-border rounded text-sm outline-none focus:border-brand-forest"><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>{activeTab === 'customers' && <option value="cancelled">Cancelled</option>}</select></section>}

      {activeTab === 'customers' && <section className="space-y-3">
        <div className="flex justify-between"><h3 className="font-black">Customer organisations</h3><span className="text-xs text-gray-400">{filteredCustomers.length} results</span></div>
        {filteredCustomers.map((customer) => {
          const draftPlan = planDrafts[customer.id] ?? customer.planId ?? '';
          return <article key={customer.id} className="bg-white border border-brand-border rounded-lg p-5 grid xl:grid-cols-[minmax(260px,1.25fr)_repeat(3,minmax(90px,0.35fr))_minmax(230px,0.9fr)_auto] gap-4 xl:items-center">
            <div className="min-w-0"><div className="flex items-center gap-2"><h4 className="font-black truncate">{customer.name}</h4><span className={`text-[9px] font-mono uppercase border rounded px-2 py-1 shrink-0 ${statusTone(customer.subscriptionStatus)}`}>{customer.subscriptionStatus}</span></div><p className="text-xs text-gray-500 mt-1 truncate">{customer.industry || 'Industry not set'} · {customer.location || 'Location not set'}</p><p className="text-[9px] font-mono text-gray-400 mt-2 truncate">{customer.id}</p></div>
            <div><p className="text-[9px] font-mono uppercase text-gray-400">Users</p><p className="text-lg font-black mt-1">{customer.members}</p></div>
            <div><p className="text-[9px] font-mono uppercase text-gray-400">Facilities</p><p className="text-lg font-black mt-1">{customer.facilities}</p></div>
            <div><p className="text-[9px] font-mono uppercase text-gray-400">Records</p><p className="text-lg font-black mt-1">{customer.activityRecords}</p></div>
            <div><label className="text-[9px] font-mono uppercase text-gray-400">Subscription plan<select value={draftPlan} onChange={(event) => setPlanDrafts((current) => ({ ...current, [customer.id]: event.target.value }))} className="block w-full h-9 mt-1 px-2 border border-brand-border rounded bg-brand-offwhite text-xs outline-none focus:border-brand-forest"><option value="">No plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>{draftPlan !== (customer.planId ?? '') && <button type="button" onClick={() => void updateCustomer(customer, { planId: draftPlan })} disabled={!draftPlan || busyId === customer.id} className="text-[10px] font-bold text-brand-forest mt-2 disabled:opacity-50">Save plan change</button>}</div>
            <button type="button" onClick={() => void updateCustomer(customer, { status: customer.subscriptionStatus === 'suspended' ? 'active' : 'suspended' })} disabled={busyId === customer.id} className={`h-9 px-3 rounded text-xs font-bold disabled:opacity-50 ${customer.subscriptionStatus === 'suspended' ? 'bg-brand-forest text-white' : 'border border-red-200 text-red-700 hover:bg-red-50'}`}>{customer.subscriptionStatus === 'suspended' ? 'Reactivate' : 'Suspend'}</button>
          </article>;
        })}
        {!loading && !filteredCustomers.length && <div className="bg-white border border-brand-border rounded-lg p-8 text-center text-sm text-gray-400">No customer organisations match the current filters.</div>}
      </section>}

      {activeTab === 'users' && <section className="space-y-3">
        <div className="flex justify-between"><h3 className="font-black">All platform users</h3><span className="text-xs text-gray-400">{filteredUsers.length} results</span></div>
        {filteredUsers.map((platformUser) => <article key={platformUser.id} className="bg-white border border-brand-border rounded-lg p-5 grid lg:grid-cols-[minmax(240px,1fr)_minmax(220px,0.8fr)_minmax(180px,0.7fr)_minmax(140px,0.5fr)_auto] gap-4 lg:items-center">
          <div className="min-w-0"><div className="flex items-center gap-2"><h4 className="font-black truncate">{platformUser.name || 'Unnamed user'}</h4><span className={`text-[9px] font-mono uppercase border rounded px-2 py-1 ${statusTone(platformUser.status)}`}>{platformUser.status}</span></div><p className="text-xs text-gray-500 mt-1 truncate">{platformUser.email || 'Email unavailable'}</p></div>
          <div className="min-w-0"><p className="text-[9px] font-mono uppercase text-gray-400">Customer</p><p className="text-xs font-bold mt-1 truncate">{platformUser.organisationName}</p></div>
          <div><p className="text-[9px] font-mono uppercase text-gray-400">Access role</p><p className="text-xs font-bold mt-1">{platformUser.roles.join(', ') || 'No active role'}</p></div>
          <div><p className="text-[9px] font-mono uppercase text-gray-400">Last sign in</p><p className="text-xs mt-1">{formatDate(platformUser.lastLoginAt)}</p></div>
          <button type="button" onClick={() => void updateUserStatus(platformUser, platformUser.status === 'suspended' ? 'active' : 'suspended')} disabled={busyId === platformUser.id || platformUser.id === user?.id} title={platformUser.id === user?.id ? 'You cannot suspend your own account' : undefined} className={`h-9 px-3 rounded text-xs font-bold disabled:opacity-30 ${platformUser.status === 'suspended' ? 'bg-brand-forest text-white' : 'border border-red-200 text-red-700 hover:bg-red-50'}`}>{platformUser.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button>
        </article>)}
        {!loading && !filteredUsers.length && <div className="bg-white border border-brand-border rounded-lg p-8 text-center text-sm text-gray-400">No users match the current filters.</div>}
      </section>}

      {activeTab === 'pricing' && <PricingAdminPanel />}

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-brand-border rounded-lg p-5"><UserRoundCheck className="w-5 h-5 text-brand-forest" /><p className="font-black mt-3">Role protected</p><p className="text-xs text-gray-500 mt-1">Only Super Admin and Platform Admin accounts can access these controls.</p></div>
        <div className="bg-white border border-brand-border rounded-lg p-5"><CircleDollarSign className="w-5 h-5 text-brand-forest" /><p className="font-black mt-3">Subscription governed</p><p className="text-xs text-gray-500 mt-1">Plan and status changes update the customer subscription and operational license.</p></div>
        <div className="bg-white border border-brand-border rounded-lg p-5"><ShieldCheck className="w-5 h-5 text-brand-forest" /><p className="font-black mt-3">Actions audited</p><p className="text-xs text-gray-500 mt-1">Customer and user status changes are recorded in the platform security trail.</p></div>
      </section>
    </div>
  );
}
