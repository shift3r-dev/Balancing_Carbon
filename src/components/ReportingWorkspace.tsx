import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileCheck2, FileSpreadsheet, FileText, LoaderCircle, Send, ShieldCheck, TriangleAlert } from 'lucide-react';

import { getAuthenticatedHeaders, safeFetchJson } from '../services/apiClient.ts';
import { useEntitlements } from '../hooks/useEntitlements.ts';

type Template = { id: string; name: string; report_type: string; description: string; compliance_frameworks?: { key: string; name: string; status: string } | null };
type Report = { id: string; title: string; type: string; period: string; workflowStatus: string; createdDate: string; framework?: { key: string; name: string } | null };
type DetailedReport = Report & { summary: string; currentVersion?: { version_number?: number; calculation_snapshot?: any; validation_snapshot?: any; report_sections?: Array<{ id: string; title: string; content: any; approval_status: string }> } | null; approvals?: Array<{ id: string; status: string; comment: string; acted_at: string }> };

const statusLabel = (value?: string) => (value ?? 'draft').replaceAll('-', ' ');

export default function ReportingWorkspace() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<DetailedReport | null>(null);
  const [templateId, setTemplateId] = useState('template-management-carbon-v1');
  const [period, setPeriod] = useState('FY 2025-26');
  const [title, setTitle] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('quarterly');
  const [scheduleRecipient, setScheduleRecipient] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { entitlements, loading: entitlementLoading } = useEntitlements();
  const complianceEnabled = Boolean(entitlements.find((item) => item.key === 'reports.compliance')?.enabled);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === templateId), [templateId, templates]);

  const load = async () => {
    setLoading(true);
    const [templateData, reportData] = await Promise.all([safeFetchJson('/api/reporting/templates', undefined, { templates: [] }), safeFetchJson('/api/reporting/reports', undefined, { reports: [] })]);
    const nextTemplates = templateData?.templates ?? [];
    setTemplates(nextTemplates); setReports(reportData?.reports ?? []);
    if (!nextTemplates.some((template: Template) => template.id === templateId) && nextTemplates[0]) setTemplateId(nextTemplates[0].id);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openReport = async (reportId: string) => {
    setBusy(true); const data = await safeFetchJson(`/api/reporting/reports/${reportId}`, undefined, null);
    setSelected(data?.report ?? null); setBusy(false);
  };

  const generate = async () => {
    if (!templateId || busy) return;
    if (selectedTemplate?.compliance_frameworks?.key === 'BRSR' && !complianceEnabled) { setMessage('BRSR reporting is available on Professional and Enterprise plans.'); return; }
    setBusy(true); setMessage('');
    const data = await safeFetchJson('/api/reporting/reports/generate', { method: 'POST', body: JSON.stringify({ templateId, period, title }) }, null);
    if (data?.report) { setReports((current) => [data.report, ...current]); setSelected(data.report); setTitle(''); setMessage('Report generated from the current carbon calculation ledger.'); }
    else setMessage('The report could not be generated. Check calculation data, license, and plan access.');
    setBusy(false);
  };

  const submitReview = async () => {
    if (!selected || busy) return; setBusy(true);
    const data = await safeFetchJson(`/api/reporting/reports/${selected.id}/submit-review`, { method: 'POST', body: JSON.stringify({ comment: 'Submitted from reporting workspace.' }) }, null);
    if (data?.report) { setSelected(data.report); setReports((items) => items.map((report) => report.id === data.report.id ? data.report : report)); setMessage('Report submitted for review.'); }
    else setMessage('You do not have permission to submit this report for review.');
    setBusy(false);
  };

  const approve = async (status: 'approved' | 'changes-requested') => {
    if (!selected || busy) return; setBusy(true);
    const data = await safeFetchJson(`/api/reporting/reports/${selected.id}/approvals`, { method: 'POST', body: JSON.stringify({ status, comment: status === 'approved' ? 'Approved from reporting workspace.' : 'Changes requested from reporting workspace.' }) }, null);
    if (data?.report) { setSelected(data.report); setReports((items) => items.map((report) => report.id === data.report.id ? data.report : report)); setMessage(status === 'approved' ? 'Report approved and recorded in the audit trail.' : 'Changes requested and recorded in the audit trail.'); }
    else setMessage('You do not have permission to approve this report.');
    setBusy(false);
  };

  const saveSchedule = async () => {
    if (busy) return; setBusy(true);
    const recipients = scheduleRecipient.split(',').map((value) => value.trim()).filter(Boolean);
    const data = await safeFetchJson('/api/reporting/schedules', { method: 'POST', body: JSON.stringify({ templateId, frequency: scheduleFrequency, recipients }) }, null);
    setMessage(data?.schedule ? 'Schedule configuration saved inactive. A delivery worker is required before it can send reports.' : 'The schedule could not be saved. Compliance reporting access is required.');
    setBusy(false);
  };

  const download = async (format: 'pdf' | 'excel' | 'csv' | 'json') => {
    if (!selected || busy) return; setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/reporting/reports/${selected.id}/exports`, { method: 'POST', headers: { ...getAuthenticatedHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ format }) });
      const data = await response.json(); const exported = data?.export;
      if (!response.ok || !exported?.contentBase64) throw new Error(data?.error || 'Export failed.');
      const raw = atob(exported.contentBase64); const bytes = new Uint8Array(raw.length);
      for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
      const url = URL.createObjectURL(new Blob([bytes], { type: exported.mimeType }));
      const link = document.createElement('a'); link.href = url; link.download = exported.filename; link.click(); URL.revokeObjectURL(url);
      setMessage(`${format.toUpperCase()} export created from this immutable report version.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed.'); }
    setBusy(false);
  };

  const snapshot = selected?.currentVersion?.calculation_snapshot;
  const validation = selected?.currentVersion?.validation_snapshot;
  if (loading || entitlementLoading) return <div className="min-h-72 bg-white border border-brand-border rounded-lg flex items-center justify-center text-xs font-mono text-gray-400"><LoaderCircle className="w-5 h-5 animate-spin mr-2" /> Loading reporting workspace...</div>;

  return <div className="space-y-5">
    <section className="bg-brand-charcoal text-white border border-brand-charcoal rounded-lg p-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
      <div><p className="text-[11px] font-mono uppercase tracking-wider text-brand-sage">Reporting and compliance</p><h1 className="text-2xl font-extrabold mt-1">Calculation-backed reporting workspace</h1><p className="text-sm text-gray-300 mt-2 max-w-2xl">Every generated report preserves the current carbon calculation snapshot, factor versions, validation findings, and linked calculation references.</p></div>
      <div className="flex items-center gap-2 text-xs font-mono text-brand-sage"><ShieldCheck className="w-4 h-4" /> BRSR active. CDP, GRI, ISSB, and CSRD are ready for future templates.</div>
    </section>

    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
      <section className="bg-white border border-brand-border rounded-lg p-5 space-y-4">
        <div><h2 className="text-sm font-black text-brand-charcoal">Generate a report</h2><p className="text-xs text-gray-500 mt-1">Choose a governed template and a reporting period.</p></div>
        <label className="block text-xs font-mono text-gray-500">Template<select className="mt-1.5 w-full border border-brand-border rounded p-2.5 text-sm bg-white" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.compliance_frameworks?.key === 'BRSR' ? ' (BRSR)' : ''}</option>)}</select></label>
        {selectedTemplate?.compliance_frameworks?.key === 'BRSR' && !complianceEnabled && <p className="text-xs text-amber-700 flex gap-1.5"><TriangleAlert className="w-4 h-4 shrink-0" />BRSR report generation requires Professional or Enterprise.</p>}
        <label className="block text-xs font-mono text-gray-500">Reporting period<input className="mt-1.5 w-full border border-brand-border rounded p-2.5 text-sm" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
        <label className="block text-xs font-mono text-gray-500">Report title <span className="text-gray-400">(optional)</span><input className="mt-1.5 w-full border border-brand-border rounded p-2.5 text-sm" placeholder={selectedTemplate ? `${selectedTemplate.name} - ${period}` : 'Report title'} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <button onClick={generate} disabled={busy || !templates.length} className="w-full bg-brand-forest hover:bg-brand-green-sec disabled:opacity-50 text-white rounded p-2.5 text-xs font-bold flex justify-center items-center gap-2"><FileCheck2 className="w-4 h-4" />Generate version 1</button>
        {message && <p className="text-xs text-brand-forest bg-brand-sage/30 p-2.5 rounded">{message}</p>}
        <div className="pt-4 border-t border-brand-border space-y-2"><p className="text-xs font-black text-brand-charcoal">Schedule configuration</p><div className="grid grid-cols-2 gap-2"><select className="border border-brand-border rounded p-2 text-xs" value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select><button onClick={saveSchedule} disabled={busy} className="border border-brand-border rounded p-2 text-xs font-bold hover:bg-brand-offwhite disabled:opacity-50">Save schedule</button></div><input className="w-full border border-brand-border rounded p-2 text-xs" placeholder="Recipient emails, comma-separated" value={scheduleRecipient} onChange={(event) => setScheduleRecipient(event.target.value)} /><p className="text-[10px] text-gray-400">Saved schedules remain inactive until delivery infrastructure is configured.</p></div>
      </section>

      <section className="bg-white border border-brand-border rounded-lg overflow-hidden">
        <div className="p-5 border-b border-brand-border flex items-center justify-between"><div><h2 className="text-sm font-black">Generated reports</h2><p className="text-xs text-gray-500 mt-1">Versions stay tied to their generated calculation data.</p></div><span className="text-xs font-mono text-gray-400">{reports.length} total</span></div>
        <div className="divide-y divide-brand-border max-h-[330px] overflow-y-auto">{reports.length ? reports.map((report) => <button key={report.id} onClick={() => void openReport(report.id)} className={`w-full p-4 text-left hover:bg-brand-offwhite transition-colors ${selected?.id === report.id ? 'bg-brand-sage/25' : ''}`}><div className="flex justify-between gap-3"><div><p className="text-sm font-bold text-brand-charcoal">{report.title}</p><p className="text-xs text-gray-500 mt-1">{report.type} | {report.period}</p></div><span className="capitalize text-[11px] font-mono h-fit px-2 py-1 rounded bg-brand-offwhite text-brand-forest">{statusLabel(report.workflowStatus)}</span></div></button>) : <p className="p-6 text-sm text-gray-500">No reports have been generated yet.</p>}</div>
      </section>
    </div>

    {selected && <section className="bg-white border border-brand-border rounded-lg">
      <div className="p-5 border-b border-brand-border flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-black text-brand-charcoal">{selected.title}</h2><span className="capitalize text-[11px] font-mono px-2 py-1 bg-brand-sage/30 text-brand-forest rounded">{statusLabel(selected.workflowStatus)}</span></div><p className="text-xs text-gray-500 mt-1">{selected.type} | {selected.period} | Version {selected.currentVersion?.version_number ?? 1}</p></div><div className="flex flex-wrap gap-2"><button onClick={submitReview} disabled={busy || selected.workflowStatus !== 'draft'} className="border border-brand-border rounded px-3 py-2 text-xs font-bold flex gap-1.5 items-center disabled:opacity-50"><Send className="w-3.5 h-3.5" />Submit review</button>{selected.workflowStatus === 'under-review' && <><button onClick={() => void approve('approved')} disabled={busy} className="bg-brand-forest text-white rounded px-3 py-2 text-xs font-bold disabled:opacity-50">Approve</button><button onClick={() => void approve('changes-requested')} disabled={busy} className="border border-brand-border rounded px-3 py-2 text-xs font-bold disabled:opacity-50">Request changes</button></>}<button onClick={() => void download('pdf')} disabled={busy} className="border border-brand-border rounded px-3 py-2 text-xs font-bold flex gap-1.5 items-center"><FileText className="w-3.5 h-3.5" />PDF</button><button onClick={() => void download('excel')} disabled={busy} className="border border-brand-border rounded px-3 py-2 text-xs font-bold flex gap-1.5 items-center"><FileSpreadsheet className="w-3.5 h-3.5" />Excel</button><button onClick={() => void download('csv')} disabled={busy} className="border border-brand-border rounded px-3 py-2 text-xs font-bold flex gap-1.5 items-center"><Download className="w-3.5 h-3.5" />CSV</button></div></div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">{[['Total footprint', `${Number(snapshot?.emissionsTco2e ?? 0).toFixed(2)} tCO2e`], ['Scope 1', `${Number(snapshot?.scope1Tco2e ?? 0).toFixed(2)} tCO2e`], ['Scope 2', `${Number(snapshot?.scope2Tco2e ?? 0).toFixed(2)} tCO2e`], ['Calculation records', String(snapshot?.calculationCount ?? 0)]].map(([label, value]) => <div key={label} className="bg-brand-offwhite border border-brand-border/60 rounded p-3"><p className="text-[10px] uppercase tracking-wider font-mono text-gray-500">{label}</p><p className="mt-1 text-base font-black text-brand-charcoal">{value}</p></div>)}</div>
      <div className="px-5 pb-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] gap-5"><div className="border border-brand-border rounded"><div className="p-4 border-b border-brand-border"><h3 className="text-sm font-black">Report sections</h3></div><div className="divide-y divide-brand-border">{selected.currentVersion?.report_sections?.map((section) => <div key={section.id} className="p-4"><div className="flex justify-between gap-3"><h4 className="text-sm font-bold">{section.title}</h4><span className="text-[10px] font-mono text-gray-500">{statusLabel(section.approval_status)}</span></div><p className="text-xs text-gray-600 mt-2 leading-relaxed">{section.content?.narrative ?? 'Calculated data and evidence are retained in this report version.'}</p></div>)}</div></div><aside className="border border-brand-border rounded p-4"><h3 className="text-sm font-black">Validation readiness</h3><p className="capitalize mt-2 text-xs font-mono text-brand-forest">{statusLabel(validation?.status)}</p><div className="mt-3 space-y-2 text-xs text-gray-600"><p>Evidence coverage: {Number(validation?.metrics?.activityEvidenceCoverage ?? 0).toFixed(1)}%</p><p>Approved activity coverage: {Number(validation?.metrics?.approvedActivityCoverage ?? 0).toFixed(1)}%</p>{[...(validation?.errors ?? []), ...(validation?.warnings ?? [])].map((item: string) => <p key={item} className="flex gap-1.5 text-amber-700"><TriangleAlert className="w-3.5 h-3.5 shrink-0" />{item}</p>)}</div>{selected.approvals?.length ? <div className="mt-4 pt-4 border-t border-brand-border"><p className="text-[10px] uppercase font-mono text-gray-500">Approval trail</p>{selected.approvals.map((approval) => <p key={approval.id} className="text-xs mt-2 flex gap-1.5 items-center"><CheckCircle2 className="w-3.5 h-3.5 text-brand-forest" />{statusLabel(approval.status)}</p>)}</div> : null}</aside></div>
    </section>}
  </div>;
}
