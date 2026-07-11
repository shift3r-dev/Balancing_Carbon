import { AlertCircle, CheckSquare, FileText, MapPin, Ruler, Save } from 'lucide-react';
import { useMemo } from 'react';

type MetadataField = any;

export default function DynamicMetadataForm({ form, values, errors = [], onChange, onSubmit, readOnly = false }: { form: any; values: Record<string, any>; errors?: any[]; onChange: (key: string, value: any) => void; onSubmit?: () => void; readOnly?: boolean }) {
  const issues = useMemo(() => new Map(errors.map((issue) => [issue.fieldKey, issue.message])), [errors]);
  const fieldsFor = (sectionId: string) => (form?.fields ?? []).filter((field: MetadataField) => field.section_id === sectionId && field.visible !== false).sort((a: MetadataField, b: MetadataField) => a.position - b.position);
  const sections = form?.sections ?? [];
  if (!form) return null;

  return <form onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }} className="space-y-5">
    {sections.map((section: any) => {
      const fields = fieldsFor(section.id); if (!fields.length) return null;
      return <section key={section.id} className="border border-brand-border bg-white p-5 rounded-lg">
        <div className="mb-4"><h3 className="font-black text-sm text-brand-charcoal">{section.title}</h3>{section.description ? <p className="text-xs text-gray-500 mt-1">{section.description}</p> : null}</div>
        <div className={`grid grid-cols-1 ${section.columns_count === 2 ? 'md:grid-cols-2' : section.columns_count >= 3 ? 'md:grid-cols-3' : ''} gap-4`}>{fields.map((field: MetadataField) => <MetadataFieldControl key={field.id} field={field} value={values[field.field_key] ?? field.default_value ?? ''} error={issues.get(field.field_key)} onChange={onChange} readOnly={readOnly || field.readOnly} />)}</div>
      </section>;
    })}
    {onSubmit && !readOnly ? <div className="flex justify-end"><button type="submit" className="inline-flex items-center gap-2 bg-brand-forest text-white px-4 py-2.5 rounded text-xs font-bold hover:bg-brand-green-sec"><Save className="w-4 h-4" />Save custom data</button></div> : null}
  </form>;
}

function MetadataFieldControl({ field, value, error, onChange, readOnly }: { field: MetadataField; value: any; error?: string; onChange: (key: string, value: any) => void; readOnly: boolean }) {
  const base = `mt-1.5 w-full border rounded px-3 py-2.5 text-sm bg-white ${error ? 'border-red-400' : 'border-brand-border'} ${readOnly ? 'bg-brand-offwhite text-gray-500' : ''}`;
  const type = field.type ?? 'text'; const options = Array.isArray(field.options) ? field.options : [];
  const label = <label className="block text-xs font-semibold text-brand-charcoal">{field.label}{field.required ? <span className="text-red-500"> *</span> : null}</label>;
  const help = <>{field.help_text ? <p className="text-[11px] text-gray-500 mt-1">{field.help_text}</p> : null}{error ? <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600"><AlertCircle className="w-3.5 h-3.5" />{error}</p> : null}</>;
  const update = (next: any) => onChange(field.field_key, next);
  if (type === 'boolean') return <div className={`col-span-${field.column_span ?? 1} border border-brand-border rounded p-3 bg-brand-offwhite/50`}><label className="flex items-center gap-2 text-xs font-semibold text-brand-charcoal"><CheckSquare className="w-4 h-4 text-brand-forest" /><input type="checkbox" checked={Boolean(value)} disabled={readOnly} onChange={(event) => update(event.target.checked)} className="accent-brand-forest" />{field.label}{field.required ? <span className="text-red-500"> *</span> : null}</label>{help}</div>;
  if (type === 'textarea' || type === 'rich-text' || type === 'json') return <div className={`col-span-${field.column_span ?? 1}`}>{label}<textarea rows={type === 'rich-text' ? 6 : 3} value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value} disabled={readOnly} placeholder={field.placeholder} onChange={(event) => update(type === 'json' ? event.target.value : event.target.value)} className={`${base} font-${type === 'json' ? 'mono' : 'sans'}`} />{help}</div>;
  if (type === 'dropdown' || type === 'reference' || type === 'unit' || type === 'organization' || type === 'facility' || type === 'user') return <div className={`col-span-${field.column_span ?? 1}`}>{label}<select value={value ?? ''} disabled={readOnly} onChange={(event) => update(event.target.value)} className={base}><option value="">Select an option</option>{options.map((option: any) => <option key={option.value ?? option.id ?? option} value={option.value ?? option.id ?? option}>{option.label ?? option.name ?? option}</option>)}</select>{help}</div>;
  if (type === 'multi-select') return <div className={`col-span-${field.column_span ?? 1}`}>{label}<select multiple value={Array.isArray(value) ? value : []} disabled={readOnly} onChange={(event) => update(Array.from(event.target.selectedOptions).map((option) => option.value))} className={`${base} min-h-28`}>{options.map((option: any) => <option key={option.value ?? option.id ?? option} value={option.value ?? option.id ?? option}>{option.label ?? option.name ?? option}</option>)}</select>{help}</div>;
  const inputType = ['number', 'decimal', 'currency', 'percentage', 'measurement', 'formula'].includes(type) ? 'number' : type === 'email' ? 'email' : type === 'url' ? 'url' : ['date', 'datetime', 'time'].includes(type) ? (type === 'datetime' ? 'datetime-local' : type) : 'text';
  const icon = type === 'measurement' ? <Ruler className="w-4 h-4" /> : type === 'location' ? <MapPin className="w-4 h-4" /> : ['document', 'image', 'signature', 'file-upload'].includes(type) ? <FileText className="w-4 h-4" /> : null;
  return <div className={`col-span-${field.column_span ?? 1}`}>{label}<div className="relative">{icon ? <span className="absolute left-3 top-4 text-gray-400">{icon}</span> : null}<input type={['document', 'image', 'signature', 'file-upload'].includes(type) ? 'text' : inputType} step={inputType === 'number' ? 'any' : undefined} value={value ?? ''} disabled={readOnly} placeholder={field.placeholder} onChange={(event) => update(inputType === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} className={`${base} ${icon ? 'pl-10' : ''}`} /></div>{help}</div>;
}
