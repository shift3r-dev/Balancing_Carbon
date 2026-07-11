import { AlertTriangle, CheckCircle2, Database, FileSpreadsheet, Link2, RefreshCw, RotateCcw, Save, Upload, Workflow, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getAuthenticatedHeaders, safeFetchJson } from '../services/apiClient.ts';

type Tab = 'import' | 'staging' | 'connectors' | 'ledgers';

export default function EnterpriseDataHub() {
  const [tab, setTab] = useState<Tab>('import');
  const [connectors, setConnectors] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [staging, setStaging] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [sourceKey, setSourceKey] = useState('energy-activity');
  const [sampleFacilityId, setSampleFacilityId] = useState('');
  const [filename, setFilename] = useState('energy-import.csv');
  const [content, setContent] = useState('Facility,Date,Source Type,Quantity,Unit,Source Document\nfacility-id,2026-07-01,Grid Electricity,1200,kWh,electricity-bill.pdf');
  const [contentBase64, setContentBase64] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [ledger, setLedger] = useState('water');
  const [ledgerRecords, setLedgerRecords] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [connectorData, connectionData, sourceData, jobData, stagingData, facilityData, mappingData] = await Promise.all([
      safeFetchJson('/api/data-platform/connectors', undefined, { connectors: [] }),
      safeFetchJson('/api/data-platform/connections', undefined, { connections: [] }),
      safeFetchJson('/api/data-platform/sources', undefined, { sources: [] }),
      safeFetchJson('/api/data-platform/jobs', undefined, { jobs: [] }),
      safeFetchJson('/api/data-platform/staging?status=all', undefined, { records: [] }),
      safeFetchJson('/api/facilities', undefined, { facilities: [] }),
      safeFetchJson('/api/data-platform/mappings', undefined, { mappings: [] }),
    ]);
    setConnectors(connectorData.connectors ?? []);
    setConnections(connectionData.connections ?? []);
    setSources(sourceData.sources ?? []);
    setJobs(jobData.jobs ?? []);
    setStaging(stagingData.records ?? []);
    const availableFacilities = Array.isArray(facilityData) ? facilityData : (facilityData.facilities ?? []);
    setFacilities(availableFacilities);
    setMappings(mappingData.mappings ?? []);
    if (!sampleFacilityId && availableFacilities[0]?.id) setSampleFacilityId(availableFacilities[0].id);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (tab === 'ledgers') void loadLedger(); }, [tab, ledger]);
  const selectedSource = useMemo(() => sources.find((source) => source.source_key === sourceKey), [sources, sourceKey]);
  const qualityIssues = useMemo(() => preview?.rows?.flatMap((row: any) => row.issues ?? []) ?? [], [preview]);

  const request = async (url: string, options: RequestInit) => {
    const response = await fetch(url, { ...options, headers: { ...getAuthenticatedHeaders(options.headers), 'Content-Type': 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? `Request failed with status ${response.status}.`);
    return data;
  };
  const readFile = (file?: File) => {
    if (!file) return;
    setFilename(file.name); setMapping({}); setPreview(null);
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      const reader = new FileReader(); reader.onload = () => { setContentBase64(String(reader.result ?? '').split(',')[1] ?? ''); setContent(''); }; reader.readAsDataURL(file); return;
    }
    setContentBase64(''); const reader = new FileReader(); reader.onload = () => setContent(String(reader.result ?? '')); reader.readAsText(file);
  };
  const useSample = () => { if (!sampleFacilityId) return; setFilename('energy-import.csv'); setContentBase64(''); setContent(`Facility,Date,Source Type,Quantity,Unit,Source Document\n${sampleFacilityId},${new Date().toISOString().slice(0, 10)},Grid Electricity,1200,kWh,electricity-bill.pdf`); };
  const previewImport = async () => { setBusy(true); setMessage(''); try { const data = await request('/api/data-platform/imports/preview', { method: 'POST', body: JSON.stringify({ filename, sourceKey, content, contentBase64, mapping: Object.keys(mapping).length ? mapping : undefined }) }); setPreview(data); setMapping(data.job.mapping ?? {}); setMessage('Preview complete. Review mapping and quality results before staging.'); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to preview import.'); } setBusy(false); };
  const commit = async () => { if (!preview?.job?.id) return; setBusy(true); try { const data = await request(`/api/data-platform/jobs/${preview.job.id}/commit`, { method: 'POST', body: '{}' }); setMessage(data.run.imported ? `${data.run.imported} row(s) added to staging.` : `${data.run.duplicatesSkipped ?? 0} existing duplicate(s) skipped.`); await load(); setTab('staging'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to commit import.'); } setBusy(false); };
  const saveMapping = async () => { setBusy(true); try { await request('/api/data-platform/mappings', { method: 'POST', body: JSON.stringify({ sourceKey, name: `${selectedSource?.name ?? sourceKey} mapping`, mapping }) }); setMessage('Column mapping saved for reuse.'); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save mapping.'); } setBusy(false); };
  const applySavedMapping = (id: string) => { const saved = mappings.find((item) => item.id === id); if (!saved) return; setMapping(Object.fromEntries((saved.data_mapping_fields ?? []).map((field: any) => [field.source_column, field.target_field]))); };
  const review = async (id: string, action: 'approved' | 'rejected') => { setBusy(true); try { const endpoint = action === 'rejected' ? `/api/data-platform/staging/${id}/reject` : `/api/data-platform/staging/${id}/review`; await request(endpoint, { method: 'POST', body: JSON.stringify({ action }) }); setMessage(`Staged record ${action}.`); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to review record.'); } setBusy(false); };
  const post = async (id: string) => { setBusy(true); try { const data = await request(`/api/data-platform/staging/${id}/post`, { method: 'POST', body: '{}' }); setMessage(`Posted to ${data.posted.target} with lineage.`); window.dispatchEvent(new Event('balancing-carbon-ledger-updated')); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to post record.'); } setBusy(false); };
  const retry = async (id: string) => { setBusy(true); try { await request(`/api/data-platform/jobs/${id}/retry`, { method: 'POST', body: '{}' }); setMessage('Import job returned to the ready queue.'); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to retry job.'); } setBusy(false); };
  const loadLedger = async () => { const data = await safeFetchJson(`/api/data-platform/operational/${ledger}`, undefined, { records: [] }); setLedgerRecords(data.records ?? []); };

  return <section className="space-y-5">
    <header className="bg-white border border-brand-border rounded-lg p-6">
      <div className="flex items-center gap-2"><Database className="w-5 h-5 text-brand-forest" /><h1 className="text-lg font-black">Enterprise Data Hub</h1></div>
      <p className="text-xs text-gray-500 mt-1">Governed ingestion, mapping, quality control, staging, approval, and operational posting.</p>
      <nav className="mt-5 flex flex-wrap gap-1 border-b border-brand-border">{([['import','Import'],['staging','Staging'],['connectors','Connectors'],['ledgers','Environmental Ledgers']] as const).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`px-3 py-2 text-xs font-bold border-b-2 ${tab === id ? 'border-brand-forest text-brand-forest' : 'border-transparent text-gray-500'}`}>{label}</button>)}</nav>
    </header>

    {tab === 'import' && <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
      <div className="space-y-5">
        <Panel title="Bulk import" icon={<Upload className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Data source"><select value={sourceKey} onChange={(event) => { setSourceKey(event.target.value); setMapping({}); setPreview(null); }} className="input">{sources.map((source) => <option key={source.id} value={source.source_key}>{source.name}</option>)}</select></Field><Field label="CSV or Excel workbook"><input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => readFile(event.target.files?.[0])} className="input" /></Field></div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 items-end"><Field label="Registered facility"><select value={sampleFacilityId} onChange={(event) => setSampleFacilityId(event.target.value)} className="input">{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} - {facility.id}</option>)}</select></Field><button onClick={useSample} disabled={!sampleFacilityId} className="btn-secondary">Use in sample CSV</button></div>
          {contentBase64 ? <p className="mt-3 rounded border border-brand-border bg-brand-offwhite p-3 text-xs">Excel workbook ready: {filename}</p> : <Field label="CSV content"><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={7} className="input font-mono" /></Field>}
          <div className="mt-3 flex justify-end"><button onClick={() => void previewImport()} disabled={busy || (!content.trim() && !contentBase64)} className="btn-primary">{busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}Validate and preview</button></div>
        </Panel>
        {preview && <Panel title="Mapping and quality preview">
          <div className="flex flex-wrap justify-between gap-3"><p className="text-xs text-gray-500">{preview.job.filename} - {preview.job.rowCount} rows</p><button onClick={() => void commit()} disabled={busy || !preview.job.validCount} className="btn-dark"><Workflow className="w-4 h-4" />Add valid rows to staging</button></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">{[['Rows',preview.job.rowCount],['Valid',preview.job.validCount],['Invalid',preview.job.invalidCount],['Duplicates',preview.job.duplicateCount],['Confidence',`${Number(preview.job.confidenceScore).toFixed(0)}%`]].map(([label,value]) => <Metric key={String(label)} label={String(label)} value={value} />)}</div>
          <div className="mt-4 border border-brand-border rounded p-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-bold">Column mapping</p><div className="flex gap-2"><select onChange={(event) => applySavedMapping(event.target.value)} defaultValue="" className="border border-brand-border rounded p-1.5 text-xs"><option value="">Saved mappings</option>{mappings.filter((item) => item.data_source_definitions?.source_key === sourceKey).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button onClick={() => void saveMapping()} className="btn-link"><Save className="w-3.5 h-3.5" />Save mapping</button><button onClick={() => void previewImport()} className="btn-link">Revalidate</button></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">{(preview.job.headers ?? []).map((header: string) => <label key={header} className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-2 text-xs"><span className="truncate font-mono">{header}</span><span>→</span><select value={mapping[header] ?? ''} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))} className="input"><option value="">Ignore</option>{[...(selectedSource?.required_fields ?? []), ...(selectedSource?.optional_fields ?? [])].map((field: string) => <option key={field} value={field}>{field.replace(/_/g,' ')}</option>)}</select></label>)}</div></div>
          <RowsTable rows={preview.rows ?? []} />{qualityIssues.length ? <p className="mt-3 text-xs text-amber-700">{qualityIssues.length} quality issue(s) require correction.</p> : null}
        </Panel>}
      </div>
      <Panel title="Import queue"><div className="space-y-2">{jobs.map((job) => <div key={job.id} className="border-b border-brand-border pb-2"><div className="flex justify-between gap-2"><span className="text-xs font-bold truncate">{job.filename}</span><span className="text-[10px] font-mono text-brand-forest">{job.status}</span></div><div className="flex justify-between mt-1"><span className="text-[10px] text-gray-400">{job.row_count} rows - {Number(job.confidence_score).toFixed(0)}%</span>{['failed','partial','ready'].includes(job.status) ? <button onClick={() => void retry(job.id)} className="btn-link"><RotateCcw className="w-3 h-3" />Retry</button> : null}</div></div>)}{!jobs.length ? <Empty text="No import jobs." /> : null}</div></Panel>
    </div>}

    {tab === 'staging' && <Panel title="Staging ledger"><p className="text-xs text-gray-500 mb-4">Approve validated records before posting them into operational ledgers.</p><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-brand-offwhite"><tr><th className="p-2 text-left">Source</th><th className="p-2 text-left">Target</th><th className="p-2 text-left">Canonical data</th><th className="p-2">Quality</th><th className="p-2">Status</th><th className="p-2 text-right">Actions</th></tr></thead><tbody className="divide-y divide-brand-border">{staging.map((record) => <tr key={record.id}><td className="p-2">{record.data_import_jobs?.filename ?? record.data_source_definitions?.name}</td><td className="p-2 font-mono">{record.target_entity_key}</td><td className="p-2 max-w-2xl font-mono text-[10px]">{JSON.stringify(record.canonical_data)}</td><td className="p-2 text-center">{Number(record.quality_score).toFixed(0)}%</td><td className="p-2 text-center font-bold text-brand-forest">{record.status}</td><td className="p-2"><div className="flex justify-end gap-1">{record.status === 'staged' && <button onClick={() => void review(record.id,'approved')} className="btn-small-green">Approve</button>}{['staged','approved'].includes(record.status) && <button onClick={() => void review(record.id,'rejected')} className="btn-small"><XCircle className="w-3 h-3" />Reject</button>}{record.status === 'approved' && <button onClick={() => void post(record.id)} className="btn-small-dark">Post</button>}</div></td></tr>)}{!staging.length && <tr><td colSpan={6}><Empty text="No staged records." /></td></tr>}</tbody></table></div></Panel>}

    {tab === 'connectors' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><Panel title="Connector catalog" icon={<Link2 className="w-4 h-4" />}><div className="space-y-2">{connectors.map((connector) => <div key={connector.id} className="border border-brand-border rounded p-3 flex justify-between gap-3"><div><p className="text-xs font-bold">{connector.name}</p><p className="text-[10px] text-gray-500">{connector.category} - {connector.auth_type}</p><p className="text-[10px] text-gray-400 mt-1">{connector.description}</p></div><span className={`h-fit text-[9px] uppercase font-bold px-2 py-1 rounded ${connector.status === 'available' ? 'bg-brand-sage text-brand-forest' : 'bg-brand-offwhite text-gray-500'}`}>{connector.status}</span></div>)}</div></Panel><Panel title="Configured connections"><div className="space-y-2">{connections.map((connection) => <div key={connection.id} className="border border-brand-border rounded p-3"><div className="flex justify-between"><p className="text-xs font-bold">{connection.name}</p><span className="text-[10px] font-mono">{connection.status}</span></div><p className="text-[10px] text-gray-400 mt-1">{connection.data_connector_catalog?.name}</p></div>)}{!connections.length && <Empty text="No live connections configured. ERP connectors require customer credentials and vendor contracts." />}</div></Panel></div>}

    {tab === 'ledgers' && <Panel title="Environmental operational ledgers"><div className="flex gap-2 mb-4">{['water','waste','material','air'].map((value) => <button key={value} onClick={() => setLedger(value)} className={`px-3 py-2 rounded text-xs font-bold ${ledger === value ? 'bg-brand-forest text-white' : 'bg-brand-offwhite text-gray-500'}`}>{value.replace(/^./, (char) => char.toUpperCase())}</button>)}</div><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-brand-offwhite"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Facility</th><th className="p-2 text-left">Record</th><th className="p-2 text-left">Evidence</th></tr></thead><tbody className="divide-y divide-brand-border">{ledgerRecords.map((record) => <tr key={record.id}><td className="p-2">{record.date}</td><td className="p-2 font-mono">{record.facility_id}</td><td className="p-2 font-mono text-[10px]">{JSON.stringify(record)}</td><td className="p-2">{record.source_document || '-'}</td></tr>)}{!ledgerRecords.length && <tr><td colSpan={4}><Empty text={`No ${ledger} records posted.`} /></td></tr>}</tbody></table></div></Panel>}
    {message && <p className="border border-brand-border bg-brand-offwhite rounded p-3 text-xs">{message}</p>}
  </section>;
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) { return <section className="bg-white border border-brand-border rounded-lg p-5"><div className="flex items-center gap-2 mb-3 text-brand-forest">{icon}<h2 className="font-black text-sm text-brand-charcoal">{title}</h2></div>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs text-gray-500 mt-3">{label}{children}</label>; }
function Metric({ label, value }: { label: string; value: any }) { return <div className="border border-brand-border rounded p-3"><p className="text-[10px] uppercase font-mono text-gray-400">{label}</p><p className="font-black mt-1">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-xs text-gray-400">{text}</div>; }
function RowsTable({ rows }: { rows: any[] }) { return <div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><thead className="bg-brand-offwhite"><tr><th className="p-2 text-left">Row</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Mapped data</th><th className="p-2 text-left">Issues</th></tr></thead><tbody className="divide-y divide-brand-border">{rows.slice(0,50).map((row) => <tr key={row.id}><td className="p-2">{row.row_number}</td><td className="p-2">{row.status === 'valid' ? <span className="flex items-center gap-1 text-brand-forest"><CheckCircle2 className="w-3.5 h-3.5" />Valid</span> : <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />{row.status}</span>}</td><td className="p-2 font-mono text-[10px]">{JSON.stringify(row.mapped_data)}</td><td className="p-2 text-[10px] text-amber-700">{(row.issues ?? []).map((issue: any) => issue.message).join(' ') || '-'}</td></tr>)}</tbody></table></div>; }
