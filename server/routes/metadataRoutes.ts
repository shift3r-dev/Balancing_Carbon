import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { type AuthenticatedRequest, requireAuth, requirePermission } from '../auth.js';
import { auditMetadata, clearMetadataCache, evaluateMetadataCondition, listMetadataEntities, listMetadataFieldTypes, listMetadataForms, listMetadataLayouts, listMetadataTemplates, loadMetadataForm, metadataValues, renderMetadataForm, saveMetadataValues, snapshotMetadata, transitionMetadataWorkflow, validateMetadataValues } from '../metadataEngine.js';
import { str } from '../requestUtils.js';
import { supabaseAdmin } from '../supabaseClients.js';

const list = (value: unknown): any[] => Array.isArray(value) ? value : [];
const safeKey = (value: unknown) => str(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function parseCsvRow(line: string) {
  const values: string[] = []; let current = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { values.push(current); current = ''; }
    else current += character;
  }
  values.push(current); return values.map((value) => value.trim());
}

function csvImportPayload(input: any) {
  const rows = String(input.csv ?? '').split(/\r?\n/).filter(Boolean); if (rows.length < 2) throw new Error('CSV import requires a header row and at least one field.');
  const headers = parseCsvRow(rows[0]).map((header) => safeKey(header).replace(/-/g, '_'));
  const fields = rows.slice(1).map((row) => Object.fromEntries(parseCsvRow(row).map((value, index) => [headers[index], value]))).filter((row: any) => row.field_key || row.label).map((row: any, index) => ({ fieldKey: row.field_key || row.label, label: row.label || row.field_key, type: row.type || 'text', sectionKey: row.section_key || 'general', isRequired: row.required === 'true', position: index }));
  const sectionKeys = [...new Set(fields.map((field: any) => field.sectionKey))];
  return { ...input, fields, sections: sectionKeys.map((sectionKey, position) => ({ sectionKey, title: sectionKey.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), sectionType: 'columns', columnsCount: 2, position })) };
}

async function entityByInput(value: unknown) {
  const raw = str(value); if (!raw) return null;
  const query = supabaseAdmin.from('metadata_entities').select('*').eq('is_active', true).is('deleted_at', null);
  const { data, error } = raw.startsWith('meta-entity-') ? await query.eq('id', raw).maybeSingle() : await query.eq('entity_key', safeKey(raw)).maybeSingle();
  if (error) throw new Error(error.message); return data;
}

async function assertOwnForm(organisationId: string, formId: string) {
  const { data, error } = await supabaseAdmin.from('metadata_forms').select('*').eq('id', formId).or(`organisation_id.is.null,organisation_id.eq.${organisationId}`).is('deleted_at', null).maybeSingle();
  if (error || !data) throw new Error(error?.message ?? 'Metadata form not found.'); return data;
}

async function resolveFieldTypes() {
  const { data, error } = await supabaseAdmin.from('metadata_field_types').select('id,type_key').eq('is_active', true).is('deleted_at', null);
  if (error) throw new Error(error.message); return new Map((data ?? []).flatMap((row: any) => [[row.id, row.id], [row.type_key, row.id]]));
}

async function saveFormStructure(organisationId: string, userId: string, form: any, payload: any) {
  const typeMap = await resolveFieldTypes();
  const sections = list(payload.sections); const sectionIdByKey = new Map<string, string>();
  const sectionRows = sections.map((section, index) => {
    const id = str(section.id) || `metadata-section-${randomUUID()}`; sectionIdByKey.set(str(section.sectionKey, section.section_key) || `section-${index + 1}`, id);
    return { id, form_id: form.id, section_key: str(section.sectionKey, section.section_key) || `section-${index + 1}`, title: str(section.title) || `Section ${index + 1}`, description: str(section.description), section_type: ['tab', 'section', 'card', 'columns', 'accordion', 'group', 'repeatable'].includes(str(section.sectionType, section.section_type)) ? str(section.sectionType, section.section_type) : 'section', position: Number(section.position ?? index), columns_count: Math.max(1, Math.min(4, Number(section.columnsCount ?? section.columns_count ?? 1))), configuration: section.configuration ?? {}, deleted_at: null };
  });
  if (sectionRows.length) { const { error } = await supabaseAdmin.from('metadata_form_sections').upsert(sectionRows); if (error) throw new Error(error.message); }
  const fields = list(payload.fields); const fieldRows = fields.map((field, index) => {
    const typeId = typeMap.get(str(field.fieldTypeId, field.field_type_id) || str(field.type)); if (!typeId) throw new Error(`Unsupported metadata field type: ${str(field.type) || 'missing'}.`);
    const sectionKey = str(field.sectionKey, field.section_key); const sectionId = str(field.sectionId, field.section_id) || sectionIdByKey.get(sectionKey) || sectionRows[0]?.id || null;
    return { id: str(field.id) || `metadata-field-${randomUUID()}`, organisation_id: form.organisation_id, entity_id: form.entity_id, form_id: form.id, section_id: sectionId, field_type_id: typeId, field_key: safeKey(field.fieldKey ?? field.field_key ?? field.label) || `field-${index + 1}`, label: str(field.label) || `Field ${index + 1}`, help_text: str(field.helpText, field.help_text), placeholder: str(field.placeholder), position: Number(field.position ?? index), column_span: Math.max(1, Math.min(4, Number(field.columnSpan ?? field.column_span ?? 1))), is_required: Boolean(field.isRequired ?? field.is_required), is_system: false, status: form.status === 'published' ? 'published' : 'draft', default_value: field.defaultValue ?? field.default_value ?? null, options: list(field.options), configuration: field.configuration ?? {}, created_by: userId, deleted_at: null };
  });
  if (fieldRows.length) { const { error } = await supabaseAdmin.from('metadata_fields').upsert(fieldRows, { onConflict: 'organisation_id,entity_id,field_key' }); if (error) throw new Error(error.message); }
  const fieldByKey = new Map(fieldRows.map((field: any) => [field.field_key, field.id]));
  const validationRows = list(payload.validations).flatMap((validation, index) => {
    const fieldId = str(validation.fieldId, validation.field_id) || fieldByKey.get(safeKey(str(validation.fieldKey, validation.field_key))); if (!fieldId) return [];
    const type = str(validation.validationType, validation.validation_type); if (!['required', 'minimum', 'maximum', 'regex', 'unique', 'cross-field', 'reference', 'conditional', 'custom'].includes(type)) return [];
    return [{ id: str(validation.id) || `metadata-validation-${randomUUID()}`, field_id: fieldId, validation_type: type, rule_config: validation.ruleConfig ?? validation.rule_config ?? {}, message: str(validation.message), position: Number(validation.position ?? index), status: 'active', deleted_at: null }];
  });
  if (validationRows.length) { const { error } = await supabaseAdmin.from('metadata_validations').upsert(validationRows); if (error) throw new Error(error.message); }
  return { sections: sectionRows, fields: fieldRows, validations: validationRows };
}

export function createMetadataRouter() {
  const router = Router();

  router.get('/metadata/entities', requireAuth, requirePermission('metadata.read'), async (_req, res) => {
    try { res.json({ entities: await listMetadataEntities() }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load metadata entities.' }); }
  });
  router.post('/metadata/entities', requireAuth, requirePermission('metadata.manage'), async (req: AuthenticatedRequest, res) => {
    try {
      const key = safeKey(req.body?.entityKey ?? req.body?.entity_key); const name = str(req.body?.name); if (!key || !name) return res.status(400).json({ error: 'entityKey and name are required.' });
      const id = `metadata-entity-${randomUUID()}`; const { data, error } = await supabaseAdmin.from('metadata_entities').insert({ id, entity_key: key, name, description: str(req.body?.description), icon: str(req.body?.icon) || 'database', is_system: false, configuration: req.body?.configuration ?? {} }).select('*').single();
      if (error || !data) throw new Error(error?.message ?? 'Unable to create metadata entity.'); await auditMetadata(req.authorization!.organisationId, req.authUser!.id, 'entity', id, 'created', {}, data); res.status(201).json({ entity: data });
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create metadata entity.' }); }
  });
  router.get('/metadata/field-types', requireAuth, requirePermission('metadata.read'), async (_req, res) => { try { res.json({ fieldTypes: await listMetadataFieldTypes() }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load field types.' }); } });
  router.get('/metadata/forms', requireAuth, requirePermission('metadata.read'), async (req: AuthenticatedRequest, res) => { try { res.json({ forms: await listMetadataForms(req.authorization!.organisationId, str(req.query.entity)) || [] }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load metadata forms.' }); } });
  router.get('/metadata/forms/:id', requireAuth, requirePermission('metadata.read'), async (req: AuthenticatedRequest, res) => { try { const form = await loadMetadataForm(req.authorization!.organisationId, { formId: req.params.id, languageCode: str(req.query.language) || 'en' }); if (!form) return res.status(404).json({ error: 'Metadata form not found.' }); res.json({ form }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load metadata form.' }); } });
  router.post('/metadata/forms', requireAuth, requirePermission('metadata.manage'), async (req: AuthenticatedRequest, res) => {
    try {
      const organisationId = req.authorization!.organisationId; const body = req.body ?? {}; const entity = await entityByInput(body.entityId ?? body.entityKey ?? body.entity_key); const name = str(body.name); if (!entity || !name) return res.status(400).json({ error: 'An active entity and form name are required.' });
      const formKey = safeKey(body.formKey ?? body.form_key ?? name); const id = `metadata-form-${randomUUID()}`; const status = body.status === 'published' ? 'published' : 'draft';
      const { data: form, error } = await supabaseAdmin.from('metadata_forms').insert({ id, organisation_id: organisationId, entity_id: entity.id, form_key: formKey, name, description: str(body.description), status, version_number: 1, layout_mode: ['sections', 'tabs', 'cards', 'accordion'].includes(str(body.layoutMode, body.layout_mode)) ? str(body.layoutMode, body.layout_mode) : 'sections', industry_code: str(body.industryCode, body.industry_code), configuration: body.configuration ?? {}, published_at: status === 'published' ? new Date().toISOString() : null, created_by: req.authUser!.id }).select('*').single();
      if (error || !form) throw new Error(error?.message ?? 'Unable to create metadata form.'); const structure = await saveFormStructure(organisationId, req.authUser!.id, form, body); await snapshotMetadata(organisationId, req.authUser!.id, 'form', form.id, status, { form, ...structure }, 'Initial metadata form version.'); await auditMetadata(organisationId, req.authUser!.id, 'form', form.id, 'created', {}, { form, ...structure }); clearMetadataCache(organisationId); res.status(201).json({ form: await loadMetadataForm(organisationId, { formId: form.id }) });
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create metadata form.' }); }
  });
  router.put('/metadata/forms/:id', requireAuth, requirePermission('metadata.manage'), async (req: AuthenticatedRequest, res) => {
    try {
      const organisationId = req.authorization!.organisationId; const before = await assertOwnForm(organisationId, req.params.id); if (!before.organisation_id) return res.status(403).json({ error: 'System templates must be cloned before they are changed.' }); const body = req.body ?? {}; const status = ['draft', 'published', 'archived'].includes(str(body.status)) ? str(body.status) : before.status;
      const updates = { name: str(body.name) || before.name, description: body.description === undefined ? before.description : str(body.description), status, layout_mode: ['sections', 'tabs', 'cards', 'accordion'].includes(str(body.layoutMode, body.layout_mode)) ? str(body.layoutMode, body.layout_mode) : before.layout_mode, industry_code: body.industryCode === undefined && body.industry_code === undefined ? before.industry_code : str(body.industryCode, body.industry_code), configuration: body.configuration ?? before.configuration, version_number: Number(before.version_number) + 1, published_at: status === 'published' ? new Date().toISOString() : before.published_at };
      const { data: form, error } = await supabaseAdmin.from('metadata_forms').update(updates).eq('id', before.id).select('*').single(); if (error || !form) throw new Error(error?.message ?? 'Unable to update metadata form.'); const structure = await saveFormStructure(organisationId, req.authUser!.id, form, body); await snapshotMetadata(organisationId, req.authUser!.id, 'form', form.id, status, { form, ...structure }, str(body.changeSummary) || 'Metadata form updated.'); await auditMetadata(organisationId, req.authUser!.id, 'form', form.id, 'updated', before, { form, ...structure }); clearMetadataCache(organisationId); res.json({ form: await loadMetadataForm(organisationId, { formId: form.id }) });
    } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update metadata form.' }); }
  });
  router.delete('/metadata/forms/:id', requireAuth, requirePermission('metadata.manage'), async (req: AuthenticatedRequest, res) => { try { const form = await assertOwnForm(req.authorization!.organisationId, req.params.id); if (!form.organisation_id) return res.status(403).json({ error: 'System templates cannot be deleted.' }); const { error } = await supabaseAdmin.from('metadata_forms').update({ status: 'archived', deleted_at: new Date().toISOString() }).eq('id', form.id); if (error) throw new Error(error.message); await auditMetadata(req.authorization!.organisationId, req.authUser!.id, 'form', form.id, 'archived', form, {}); clearMetadataCache(req.authorization!.organisationId); res.json({ success: true }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to archive metadata form.' }); } });
  router.post('/metadata/forms/:id/publish', requireAuth, requirePermission('metadata.publish'), async (req: AuthenticatedRequest, res) => { try { const form = await assertOwnForm(req.authorization!.organisationId, req.params.id); const { data, error } = await supabaseAdmin.from('metadata_forms').update({ status: 'published', published_at: new Date().toISOString(), version_number: Number(form.version_number) + 1 }).eq('id', form.id).select('*').single(); if (error || !data) throw new Error(error?.message ?? 'Unable to publish metadata form.'); await snapshotMetadata(req.authorization!.organisationId, req.authUser!.id, 'form', form.id, 'published', { form: data }, 'Published metadata form.'); await auditMetadata(req.authorization!.organisationId, req.authUser!.id, 'form', form.id, 'published', form, data); clearMetadataCache(req.authorization!.organisationId); res.json({ form: data }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to publish metadata form.' }); } });
  router.get('/metadata/layouts', requireAuth, requirePermission('metadata.read'), async (req: AuthenticatedRequest, res) => { try { res.json({ layouts: await listMetadataLayouts(req.authorization!.organisationId, str(req.query.entity)) }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load metadata layouts.' }); } });
  router.get('/metadata/templates', requireAuth, requirePermission('metadata.read'), async (req: AuthenticatedRequest, res) => { try { res.json({ templates: await listMetadataTemplates(req.authorization!.organisationId) }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load metadata templates.' }); } });
  router.get('/metadata/render', requireAuth, requirePermission('metadata.read'), async (req: AuthenticatedRequest, res) => { try { const entityKey = str(req.query.entity); const recordId = str(req.query.recordId) || 'new'; const form = await loadMetadataForm(req.authorization!.organisationId, { formId: str(req.query.formId) || undefined, entityKey, languageCode: str(req.query.language) || 'en' }); if (!form) return res.status(404).json({ error: 'No metadata form is configured for this entity.' }); const values = recordId === 'new' ? {} : await existingValuesByRender(req.authorization!.organisationId, form.entityKey, recordId, form); const rendered = renderMetadataForm(form, values, { permissions: req.authorization!.permissions, roleIds: req.authorization!.roles }); res.json({ form: rendered, values }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to render metadata form.' }); } });
  router.post('/metadata/render/:entityKey/:recordId', requireAuth, requirePermission('metadata.values.edit'), async (req: AuthenticatedRequest, res) => { try { const form = await loadMetadataForm(req.authorization!.organisationId, { formId: str(req.body?.formId) || undefined, entityKey: req.params.entityKey }); if (!form) return res.status(404).json({ error: 'No metadata form is configured for this entity.' }); const result = await saveMetadataValues({ organisationId: req.authorization!.organisationId, userId: req.authUser!.id, entityKey: req.params.entityKey, entityRecordId: req.params.recordId, form, values: req.body?.values ?? {}, context: { permissions: req.authorization!.permissions, roleIds: req.authorization!.roles } }); if (result.issues.length) return res.status(422).json(result); res.json(result); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save metadata values.' }); } });
  router.post('/metadata/validate', requireAuth, requirePermission('metadata.values.edit'), async (req: AuthenticatedRequest, res) => { try { const form = await loadMetadataForm(req.authorization!.organisationId, { formId: str(req.body?.formId) || undefined, entityKey: str(req.body?.entityKey) }); if (!form) return res.status(404).json({ error: 'Metadata form not found.' }); const issues = await validateMetadataValues(req.authorization!.organisationId, form.entityKey, str(req.body?.recordId) || 'new', form, req.body?.values ?? {}, { permissions: req.authorization!.permissions, roleIds: req.authorization!.roles }); res.json({ valid: issues.length === 0, issues }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to validate metadata values.' }); } });
  router.post('/metadata/workflows/:id/transition', requireAuth, requirePermission('metadata.workflow'), async (req: AuthenticatedRequest, res) => { try { const result = await transitionMetadataWorkflow({ organisationId: req.authorization!.organisationId, userId: req.authUser!.id, permissions: req.authorization!.permissions, workflowId: req.params.id, entityRecordId: str(req.body?.recordId), targetStateKey: str(req.body?.targetStateKey), values: req.body?.values ?? {}, comment: str(req.body?.comment) }); res.json({ transition: result }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to transition workflow.' }); } });
  router.get('/metadata/forms/:id/export', requireAuth, requirePermission('metadata.export'), async (req: AuthenticatedRequest, res) => { try { const form = await loadMetadataForm(req.authorization!.organisationId, { formId: req.params.id }); if (!form) return res.status(404).json({ error: 'Metadata form not found.' }); const format = str(req.query.format).toLowerCase() || 'json'; if (format === 'csv') { const lines = ['field_key,label,type,section_key,required']; for (const field of form.fields) { const section = form.sections.find((item: any) => item.id === field.section_id); lines.push([field.field_key, field.label, field.type, section?.section_key ?? '', field.is_required ? 'true' : 'false'].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')); } res.type('text/csv').attachment(`${form.form_key}.csv`).send(lines.join('\n')); return; } res.json({ export: form }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to export metadata form.' }); } });
  router.post('/metadata/import', requireAuth, requirePermission('metadata.import'), async (req: AuthenticatedRequest, res) => { try { let payload = req.body?.form ?? req.body; if (payload?.format === 'csv' || typeof payload?.csv === 'string') payload = csvImportPayload(payload); if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'A JSON form payload or a CSV field-definition payload is required.' }); const entity = await entityByInput(payload.entityKey ?? payload.entity_key ?? payload.entityId); if (!entity) return res.status(400).json({ error: 'The import references an unknown metadata entity.' }); req.body = { ...payload, entityId: entity.id, name: str(payload.name) || `Imported ${entity.name} form`, formKey: safeKey(payload.formKey ?? payload.form_key ?? payload.name) || `import-${Date.now()}` }; const organisationId = req.authorization!.organisationId; const id = `metadata-form-${randomUUID()}`; const { data: form, error } = await supabaseAdmin.from('metadata_forms').insert({ id, organisation_id: organisationId, entity_id: entity.id, form_key: req.body.formKey, name: req.body.name, description: str(req.body.description), status: 'draft', configuration: req.body.configuration ?? {}, created_by: req.authUser!.id }).select('*').single(); if (error || !form) throw new Error(error?.message ?? 'Unable to import metadata form.'); const structure = await saveFormStructure(organisationId, req.authUser!.id, form, req.body); await snapshotMetadata(organisationId, req.authUser!.id, 'form', form.id, 'draft', { form, ...structure }, 'Imported metadata form.'); clearMetadataCache(organisationId); res.status(201).json({ form: await loadMetadataForm(organisationId, { formId: form.id }) }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to import metadata form.' }); } });

  return router;
}

async function existingValuesByRender(organisationId: string, entityKey: string, recordId: string, form: any) {
  const result = await metadataValues(organisationId, entityKey, recordId); const byFieldId = new Map(form.fields.map((field: any) => [field.id, field.field_key])); return Object.fromEntries(Object.entries(result.values).map(([fieldId, value]) => [byFieldId.get(fieldId) ?? fieldId, value]));
}
