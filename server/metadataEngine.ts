import { randomUUID } from 'node:crypto';

import { supabaseAdmin } from './supabaseClients.js';

type Json = Record<string, any>;
export type MetadataIssue = { fieldKey?: string; code: string; message: string };
export type MetadataForm = Json & { sections: Json[]; fields: Json[]; validations: Json[]; visibility: Json[]; permissions: Json[] };

const cache = new Map<string, { expiresAt: number; value: any }>();
const CACHE_TTL = 60_000;

export function clearMetadataCache(organisationId?: string) {
  if (!organisationId) return cache.clear();
  for (const key of cache.keys()) if (key.includes(`:${organisationId}:`)) cache.delete(key);
}

function cacheKey(kind: string, organisationId: string, value = '') { return `${kind}:${organisationId}:${value}`; }
async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key); if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await load(); cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL }); return value;
}

function active(rows: any[] | null | undefined) { return (rows ?? []).filter((row) => !row.deleted_at && row.status !== 'archived'); }
function valueOf(values: Json, key: string) { return values[key]; }
function present(value: unknown) { return value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0); }

/** Evaluates a deliberately small, data-only rule language. No user-defined JavaScript is evaluated. */
export function evaluateMetadataCondition(condition: any, values: Json, context: Json = {}): boolean {
  if (!condition || Object.keys(condition).length === 0) return true;
  if (Array.isArray(condition.all)) return condition.all.every((item) => evaluateMetadataCondition(item, values, context));
  if (Array.isArray(condition.any)) return condition.any.some((item) => evaluateMetadataCondition(item, values, context));
  if (condition.not) return !evaluateMetadataCondition(condition.not, values, context);
  const actual = condition.source === 'context' ? context[condition.field] : valueOf(values, condition.field);
  const expected = condition.value;
  switch (condition.operator ?? 'equals') {
    case 'equals': return actual === expected;
    case 'not-equals': return actual !== expected;
    case 'exists': return present(actual);
    case 'not-exists': return !present(actual);
    case 'in': return Array.isArray(expected) && expected.includes(actual);
    case 'not-in': return Array.isArray(expected) && !expected.includes(actual);
    case 'contains': return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? '').includes(String(expected ?? ''));
    case 'greater-than': return Number(actual) > Number(expected);
    case 'greater-than-or-equal': return Number(actual) >= Number(expected);
    case 'less-than': return Number(actual) < Number(expected);
    case 'less-than-or-equal': return Number(actual) <= Number(expected);
    default: return false;
  }
}

async function formTypes() {
  const { data, error } = await supabaseAdmin.from('metadata_field_types').select('id,type_key,name,category,configuration_schema').eq('is_active', true).is('deleted_at', null);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row: any) => [row.id, row]));
}

export async function listMetadataEntities() {
  const { data, error } = await supabaseAdmin.from('metadata_entities').select('*').eq('is_active', true).is('deleted_at', null).order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMetadataFieldTypes() {
  const { data, error } = await supabaseAdmin.from('metadata_field_types').select('*').eq('is_active', true).is('deleted_at', null).order('category').order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMetadataForms(organisationId: string, entityKey?: string) {
  const key = cacheKey('forms', organisationId, entityKey ?? 'all');
  return cached(key, async () => {
    let query = supabaseAdmin.from('metadata_forms').select('*, metadata_entities!inner(entity_key,name)').is('deleted_at', null).or(`organisation_id.is.null,organisation_id.eq.${organisationId}`).order('updated_at', { ascending: false });
    if (entityKey) query = query.eq('metadata_entities.entity_key', entityKey);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return active(data).map((row: any) => ({ ...row, entityKey: row.metadata_entities?.entity_key, entityName: row.metadata_entities?.name, metadata_entities: undefined }));
  });
}

async function getFormRecord(organisationId: string, formId?: string, entityKey?: string, publishedOnly = false) {
  let query = supabaseAdmin.from('metadata_forms').select('*, metadata_entities!inner(entity_key,name)').is('deleted_at', null).or(`organisation_id.is.null,organisation_id.eq.${organisationId}`);
  if (formId) query = query.eq('id', formId);
  if (entityKey) query = query.eq('metadata_entities.entity_key', entityKey);
  query = publishedOnly ? query.eq('status', 'published') : query.in('status', ['draft', 'published']);
  const { data, error } = await query.order('organisation_id', { ascending: false }).order('version_number', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function loadMetadataForm(organisationId: string, options: { formId?: string; entityKey?: string; languageCode?: string; publishedOnly?: boolean } = {}): Promise<MetadataForm | null> {
  const key = cacheKey('form', organisationId, `${options.formId ?? ''}:${options.entityKey ?? ''}:${options.languageCode ?? 'en'}:${options.publishedOnly ? 'published' : 'all'}`);
  return cached(key, async () => {
    const form = await getFormRecord(organisationId, options.formId, options.entityKey, options.publishedOnly);
    if (!form) return null;
    const [sectionsResult, fieldsResult, types] = await Promise.all([
      supabaseAdmin.from('metadata_form_sections').select('*').eq('form_id', form.id).is('deleted_at', null).order('position'),
      supabaseAdmin.from('metadata_fields').select('*').eq('form_id', form.id).is('deleted_at', null).in('status', ['draft', 'published']).order('position'),
      formTypes(),
    ]);
    if (sectionsResult.error) throw new Error(sectionsResult.error.message);
    if (fieldsResult.error) throw new Error(fieldsResult.error.message);
    const fields = active(fieldsResult.data).map((field: any) => ({ ...field, type: types.get(field.field_type_id)?.type_key ?? 'text', typeName: types.get(field.field_type_id)?.name ?? 'Text' }));
    const fieldIds = fields.map((field: any) => field.id);
    const [validationsResult, visibilityResult, permissionsResult, translationsResult] = await Promise.all([
      fieldIds.length ? supabaseAdmin.from('metadata_validations').select('*').in('field_id', fieldIds).is('deleted_at', null).eq('status', 'active').order('position') : Promise.resolve({ data: [], error: null } as any),
      fieldIds.length ? supabaseAdmin.from('metadata_visibility').select('*').in('field_id', fieldIds).order('position') : Promise.resolve({ data: [], error: null } as any),
      fieldIds.length ? supabaseAdmin.from('metadata_permissions').select('*').in('field_id', fieldIds) : Promise.resolve({ data: [], error: null } as any),
      options.languageCode && options.languageCode !== 'en' ? supabaseAdmin.from('metadata_translations').select('*').eq('language_code', options.languageCode).in('subject_id', [form.id, ...(sectionsResult.data ?? []).map((section: any) => section.id), ...fieldIds]).is('deleted_at', null) : Promise.resolve({ data: [], error: null } as any),
    ]);
    for (const result of [validationsResult, visibilityResult, permissionsResult, translationsResult]) if (result.error) throw new Error(result.error.message);
    const translated = new Map<string, any>((translationsResult.data ?? []).map((row: any) => [row.subject_id, row]));
    const translate = (row: any) => translated.has(row.id) ? { ...row, label: translated.get(row.id).label || row.label, help_text: translated.get(row.id).help_text || row.help_text, title: translated.get(row.id).label || row.title } : row;
    return { ...translate(form), entityKey: form.metadata_entities?.entity_key, entityName: form.metadata_entities?.name, sections: active(sectionsResult.data).map(translate), fields: fields.map(translate), validations: validationsResult.data ?? [], visibility: visibilityResult.data ?? [], permissions: permissionsResult.data ?? [] };
  });
}

function scopedRules<T extends Json>(rules: T[], fieldId: string) { return rules.filter((rule) => rule.field_id === fieldId); }

export function renderMetadataForm(form: MetadataForm, values: Json, context: Json) {
  const fields = form.fields.map((field: any) => {
    const visibilityRules = scopedRules(form.visibility, field.id);
    const permissionRules = scopedRules(form.permissions, field.id);
    let visible = true; let required = Boolean(field.is_required); let readOnly = false;
    for (const rule of visibilityRules) {
      if (!evaluateMetadataCondition(rule.inline_condition, values, context)) continue;
      if (rule.action === 'hide') visible = false;
      if (rule.action === 'show') visible = true;
      if (rule.action === 'require') required = true;
      if (rule.action === 'readonly') readOnly = true;
    }
    for (const rule of permissionRules) {
      const roleMatch = !rule.role_id || context.roleIds?.includes(rule.role_id);
      const permissionMatch = !rule.permission_key || context.permissions?.includes(rule.permission_key);
      if (!roleMatch || !permissionMatch) continue;
      if (rule.access_level === 'hidden') visible = false;
      if (rule.access_level === 'read') readOnly = true;
      if (rule.access_level === 'required') required = true;
    }
    return { ...field, visible, required, readOnly, value: values[field.field_key] ?? field.default_value ?? null };
  });
  return { ...form, fields, sections: form.sections.filter((section: any) => fields.some((field: any) => field.section_id === section.id && field.visible)) };
}

export async function metadataValues(organisationId: string, entityKey: string, entityRecordId: string) {
  const { data: entity, error: entityError } = await supabaseAdmin.from('metadata_entities').select('id').eq('entity_key', entityKey).eq('is_active', true).maybeSingle();
  if (entityError || !entity) throw new Error(entityError?.message ?? 'Metadata entity not found.');
  const { data, error } = await supabaseAdmin.from('metadata_values').select('field_id,value,display_value,form_version,updated_at').eq('organisation_id', organisationId).eq('entity_id', entity.id).eq('entity_record_id', entityRecordId).is('deleted_at', null);
  if (error) throw new Error(error.message);
  return { entity, values: Object.fromEntries((data ?? []).map((row: any) => [row.field_id, row.value])), records: data ?? [] };
}

async function existingValuesByKey(organisationId: string, entityKey: string, entityRecordId: string, form: MetadataForm) {
  const result = await metadataValues(organisationId, entityKey, entityRecordId);
  const fieldById = new Map(form.fields.map((field: any) => [field.id, field.field_key]));
  return Object.fromEntries(Object.entries(result.values).map(([fieldId, value]) => [fieldById.get(fieldId) ?? fieldId, value]));
}

export async function validateMetadataValues(organisationId: string, entityKey: string, entityRecordId: string, form: MetadataForm, values: Json, context: Json = {}): Promise<MetadataIssue[]> {
  const issues: MetadataIssue[] = [];
  const rendered = renderMetadataForm(form, values, context);
  for (const field of rendered.fields.filter((item: any) => item.visible)) {
    const value = values[field.field_key];
    if (field.required && !present(value)) issues.push({ fieldKey: field.field_key, code: 'required', message: `${field.label} is required.` });
    for (const validation of scopedRules(form.validations, field.id)) {
      const config = validation.rule_config ?? {}; const message = validation.message || `${field.label} is invalid.`;
      if (validation.validation_type === 'minimum' && present(value) && Number(value) < Number(config.value)) issues.push({ fieldKey: field.field_key, code: 'minimum', message });
      if (validation.validation_type === 'maximum' && present(value) && Number(value) > Number(config.value)) issues.push({ fieldKey: field.field_key, code: 'maximum', message });
      if (validation.validation_type === 'regex' && present(value) && config.pattern && !(new RegExp(config.pattern)).test(String(value))) issues.push({ fieldKey: field.field_key, code: 'regex', message });
      if (validation.validation_type === 'conditional' && evaluateMetadataCondition(config.when, values, context) && !present(value)) issues.push({ fieldKey: field.field_key, code: 'conditional', message });
      if (validation.validation_type === 'cross-field' && config.otherField && present(value) && !evaluateMetadataCondition({ field: field.field_key, operator: config.operator ?? 'equals', value: values[config.otherField] }, values, context)) issues.push({ fieldKey: field.field_key, code: 'cross-field', message });
      if (validation.validation_type === 'unique' && present(value)) {
        const { data, error } = await supabaseAdmin.from('metadata_values').select('entity_record_id').eq('organisation_id', organisationId).eq('field_id', field.id).eq('display_value', String(value)).neq('entity_record_id', entityRecordId).is('deleted_at', null).limit(1);
        if (error) throw new Error(error.message); if (data?.length) issues.push({ fieldKey: field.field_key, code: 'unique', message });
      }
    }
  }
  return issues;
}

export async function saveMetadataValues(input: { organisationId: string; userId: string; entityKey: string; entityRecordId: string; form: MetadataForm; values: Json; context: Json }) {
  const issues = await validateMetadataValues(input.organisationId, input.entityKey, input.entityRecordId, input.form, input.values, input.context);
  if (issues.length) return { issues, values: null };
  const { entity } = await metadataValues(input.organisationId, input.entityKey, input.entityRecordId);
  const rows = input.form.fields.filter((field: any) => Object.hasOwn(input.values, field.field_key)).map((field: any) => ({ id: `metadata-value-${randomUUID()}`, organisation_id: input.organisationId, entity_id: entity.id, entity_record_id: input.entityRecordId, field_id: field.id, value: input.values[field.field_key], display_value: Array.isArray(input.values[field.field_key]) ? input.values[field.field_key].join(', ') : String(input.values[field.field_key] ?? ''), form_version: input.form.version_number, entered_by: input.userId }));
  if (rows.length) {
    const { error } = await supabaseAdmin.from('metadata_values').upsert(rows, { onConflict: 'organisation_id,entity_record_id,field_id' });
    if (error) throw new Error(error.message);
  }
  await auditMetadata(input.organisationId, input.userId, 'values', input.entityRecordId, 'saved', {}, input.values);
  clearMetadataCache(input.organisationId);
  return { issues: [], values: await existingValuesByKey(input.organisationId, input.entityKey, input.entityRecordId, input.form) };
}

export async function auditMetadata(organisationId: string, userId: string | undefined, subjectType: string, subjectId: string, action: string, beforeValue: Json, afterValue: Json) {
  const { error } = await supabaseAdmin.from('metadata_audit_logs').insert({ id: `metadata-audit-${randomUUID()}`, organisation_id: organisationId, subject_type: subjectType, subject_id: subjectId, action, before_value: beforeValue, after_value: afterValue, acted_by: userId ?? null });
  if (error) throw new Error(error.message);
}

export async function snapshotMetadata(organisationId: string, userId: string, subjectType: 'form' | 'layout' | 'template' | 'workflow' | 'field', subjectId: string, status: string, snapshot: Json, summary: string) {
  const { data: last, error: lastError } = await supabaseAdmin.from('metadata_versions').select('version_number').eq('subject_type', subjectType).eq('subject_id', subjectId).order('version_number', { ascending: false }).limit(1).maybeSingle();
  if (lastError) throw new Error(lastError.message);
  const { error } = await supabaseAdmin.from('metadata_versions').insert({ id: `metadata-version-${randomUUID()}`, organisation_id: organisationId, subject_type: subjectType, subject_id: subjectId, version_number: (last?.version_number ?? 0) + 1, status, snapshot, change_summary: summary, created_by: userId });
  if (error) throw new Error(error.message);
}

export async function listMetadataTemplates(organisationId: string) {
  const { data, error } = await supabaseAdmin.from('metadata_templates').select('*, metadata_entities(entity_key,name)').is('deleted_at', null).or(`organisation_id.is.null,organisation_id.eq.${organisationId}`).in('status', ['draft', 'published']).order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMetadataLayouts(organisationId: string, entityKey?: string) {
  let query = supabaseAdmin.from('metadata_layouts').select('*, metadata_entities(entity_key,name)').is('deleted_at', null).or(`organisation_id.is.null,organisation_id.eq.${organisationId}`).in('status', ['draft', 'published']).order('priority');
  if (entityKey) query = query.eq('metadata_entities.entity_key', entityKey);
  const { data, error } = await query; if (error) throw new Error(error.message); return data ?? [];
}

export async function transitionMetadataWorkflow(input: { organisationId: string; userId: string; permissions: string[]; workflowId: string; entityRecordId: string; targetStateKey: string; values: Json; comment?: string }) {
  const { data: workflow, error: workflowError } = await supabaseAdmin.from('metadata_workflows').select('*').eq('id', input.workflowId).eq('organisation_id', input.organisationId).is('deleted_at', null).maybeSingle();
  if (workflowError || !workflow) throw new Error(workflowError?.message ?? 'Workflow not found.');
  const { data: states, error: statesError } = await supabaseAdmin.from('metadata_states').select('*').eq('workflow_id', workflow.id).is('deleted_at', null);
  if (statesError) throw new Error(statesError.message);
  const initial = states?.find((state: any) => state.state_key === workflow.initial_state_key) ?? states?.find((state: any) => state.category === 'initial');
  const target = states?.find((state: any) => state.state_key === input.targetStateKey); if (!initial || !target) throw new Error('Workflow state not found.');
  const { data: current, error: instanceError } = await supabaseAdmin.from('metadata_workflow_instances').select('*').eq('organisation_id', input.organisationId).eq('workflow_id', workflow.id).eq('entity_record_id', input.entityRecordId).maybeSingle();
  if (instanceError) throw new Error(instanceError.message);
  const fromState = current ? states?.find((state: any) => state.id === current.current_state_id) : initial;
  const { data: transitions, error: transitionError } = await supabaseAdmin.from('metadata_transitions').select('*').eq('workflow_id', workflow.id).eq('from_state_id', fromState!.id).eq('to_state_id', target.id);
  if (transitionError) throw new Error(transitionError.message);
  const transition = transitions?.[0]; if (!transition) throw new Error(`No transition from ${fromState!.name} to ${target.name}.`);
  if (transition.permission_key && !input.permissions.includes(transition.permission_key)) throw new Error('You do not have permission to perform this workflow transition.');
  if (transition.condition_id) { const { data: condition } = await supabaseAdmin.from('metadata_conditions').select('expression').eq('id', transition.condition_id).maybeSingle(); if (condition && !evaluateMetadataCondition(condition.expression, input.values)) throw new Error('The transition conditions are not met.'); }
  let instanceId = current?.id;
  if (!current) { instanceId = `metadata-workflow-instance-${randomUUID()}`; const { error } = await supabaseAdmin.from('metadata_workflow_instances').insert({ id: instanceId, organisation_id: input.organisationId, workflow_id: workflow.id, entity_id: workflow.entity_id, entity_record_id: input.entityRecordId, current_state_id: target.id, started_by: input.userId }); if (error) throw new Error(error.message); }
  else { const { error } = await supabaseAdmin.from('metadata_workflow_instances').update({ current_state_id: target.id }).eq('id', current.id); if (error) throw new Error(error.message); }
  const { error: historyError } = await supabaseAdmin.from('metadata_workflow_history').insert({ id: `metadata-workflow-history-${randomUUID()}`, instance_id: instanceId, from_state_id: fromState?.id ?? null, to_state_id: target.id, comment: input.comment ?? '', acted_by: input.userId });
  if (historyError) throw new Error(historyError.message);
  return { workflowId: workflow.id, entityRecordId: input.entityRecordId, state: target };
}
