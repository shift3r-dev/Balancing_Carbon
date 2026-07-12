import { Database, LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ensureFreshSession, getAuthenticatedHeaders } from '../services/apiClient.ts';
import DynamicMetadataForm from './DynamicMetadataForm.tsx';

interface EntityMetadataDialogProps {
  entityKey: string;
  recordId: string;
  recordName: string;
  onClose: () => void;
}

async function metadataRequest(url: string, options?: RequestInit) {
  await ensureFreshSession();
  const response = await fetch(url, {
    ...options,
    headers: { ...getAuthenticatedHeaders(options?.headers), 'Content-Type': 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

export default function EntityMetadataDialog({ entityKey, recordId, recordName, onClose }: EntityMetadataDialogProps) {
  const [form, setForm] = useState<any>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void metadataRequest(`/api/metadata/render?entity=${encodeURIComponent(entityKey)}&recordId=${encodeURIComponent(recordId)}`).then(({ ok, status, payload }) => {
      if (!active) return;
      if (ok) { setForm(payload.form); setValues(payload.values ?? {}); }
      else if (status === 404) setMessage('No published custom profile is configured. Publish a form for this entity in Metadata Studio first.');
      else setMessage(payload.error ?? 'Unable to load the custom profile.');
      setLoading(false);
    }).catch(() => { if (active) { setMessage('Unable to load the custom profile.'); setLoading(false); } });
    return () => { active = false; };
  }, [entityKey, recordId]);

  const save = async () => {
    if (!form || saving) return;
    setSaving(true); setErrors([]); setMessage('');
    try {
      const { ok, payload } = await metadataRequest(`/api/metadata/render/${encodeURIComponent(entityKey)}/${encodeURIComponent(recordId)}`, {
        method: 'POST', body: JSON.stringify({ formId: form.id, values }),
      });
      if (ok) { setValues(payload.values ?? values); setMessage('Custom profile saved.'); }
      else if (Array.isArray(payload.issues)) { setErrors(payload.issues); setMessage('Review the highlighted fields.'); }
      else setMessage(payload.error ?? 'Unable to save the custom profile.');
    } catch { setMessage('Unable to save the custom profile.'); }
    setSaving(false);
  };

  return <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-brand-border bg-brand-offwhite shadow-2xl">
      <header className="flex items-start justify-between gap-4 bg-brand-charcoal p-5 text-white">
        <div><div className="flex items-center gap-2"><Database className="h-4 w-4 text-brand-sage" /><h2 className="text-sm font-black">Custom facility profile</h2></div><p className="mt-1 text-xs text-gray-300">{recordName}</p></div>
        <button type="button" onClick={onClose} className="p-1 text-gray-300 hover:text-white" title="Close custom profile"><X className="h-5 w-5" /></button>
      </header>
      <div className="overflow-y-auto p-5">
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-xs text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading published profile...</div> : null}
        {!loading && form ? <DynamicMetadataForm form={form} values={values} errors={errors} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} onSubmit={() => void save()} /> : null}
        {!loading && !form ? <div className="border border-brand-border bg-white p-6 text-sm text-gray-600">{message}</div> : null}
        {form && message ? <p className={`mt-3 border p-3 text-xs ${errors.length ? 'border-red-200 bg-red-50 text-red-700' : 'border-brand-border bg-white text-brand-forest'}`}>{message}</p> : null}
        {saving ? <p className="mt-3 flex items-center gap-2 text-xs text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" />Saving custom profile...</p> : null}
      </div>
    </div>
  </div>;
}
