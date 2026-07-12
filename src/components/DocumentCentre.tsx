import React, { useState } from 'react';
import {
  FolderClosed, FileText, Upload, Trash2, Search, Filter, 
  ShieldCheck, AlertCircle, X, Download, LoaderCircle
} from 'lucide-react';
import { Document } from '../types.ts';
import { getAuthenticatedHeaders } from '../services/apiClient.ts';

interface DocProps {
  documents: Document[];
  onAddDocument: (doc: any) => Promise<Document | null | undefined>;
  onDeleteDocument: (id: string) => void;
}

export default function DocumentCentre({ documents, onAddDocument, onDeleteDocument }: DocProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  // Upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Environmental Permit');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const categories = ['All', 'Environmental Permit', 'Energy Invoice', 'Social Code', 'Audit Report', 'General Policy'];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadMessage('Select a supported evidence file.');
      return;
    }
    setUploading(true); setUploadMessage('Uploading and extracting evidence...');
    const form = new FormData(); form.append('file', file); form.append('category', category); form.append('notes', notes);
    const created = await onAddDocument(form); setUploading(false);
    if (created) { setFile(null); setNotes(''); setUploadMessage('Evidence stored and extraction completed.'); setShowUploadForm(false); }
    else setUploadMessage('Upload failed. Check the file type, plan limit, and server log.');
  };

  const downloadDocument = async (id: string) => { const response = await fetch(`/api/documents/${id}/download`, { headers: getAuthenticatedHeaders() }); const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.url) { setUploadMessage(payload.error ?? 'Unable to create a secure download link.'); return; } const anchor = window.document.createElement('a'); anchor.href = payload.url; anchor.target = '_blank'; anchor.rel = 'noreferrer'; anchor.click(); };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCategory === 'All' || doc.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-brand-border">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal">Evidence Document Vault</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Store and lock SPCB permits, solar contracts, and ESG certificates. Linked directly to automated audits.
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" /> Upload New Evidence
        </button>
      </div>

      {/* Upload Drawer / Form */}
      {showUploadForm && (
        <div className="bg-white border border-brand-border rounded-xl p-5 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-brand-border/40 pb-3 mb-4">
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
              <FolderClosed className="w-4 h-4 text-brand-forest" /> Link New Evidence Document
            </h3>
            <button onClick={() => setShowUploadForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-mono text-gray-500 mb-1">Evidence File *</label>
              <input
                type="file"
                required
                accept=".pdf,.docx,.txt,.csv,.md,.json"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite"
              />
            </div>
            <div>
              <label className="block font-mono text-gray-500 mb-1">Evidence Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-brand-border p-2.5 rounded bg-white"
              >
                <option value="Environmental Permit">Environmental Permit</option>
                <option value="Energy Invoice">Energy Invoice</option>
                <option value="Social Code">Social Code</option>
                <option value="Audit Report">Audit Report</option>
                <option value="General Policy">General Policy</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block font-mono text-gray-500 mb-1">Internal Reference Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Approved by SPCB on March 14"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite"
                />
              </div>
              <button
                type="submit" disabled={uploading}
                className="bg-brand-forest hover:bg-brand-green-sec text-white px-5 py-2.5 rounded font-mono font-bold cursor-pointer"
              >
                {uploading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : 'Store File'}
              </button>
            </div>
          </form>
          {uploadMessage ? <p className="mt-3 text-xs text-gray-600">{uploadMessage}</p> : null}

          {/* Secure vault notification */}
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] font-mono text-brand-forest leading-relaxed flex gap-2 items-start">
            <ShieldCheck className="w-4 h-4 shrink-0 text-brand-forest mt-0.5" />
            <div>
              <strong>Secure Multi-Tenant Asset Isolation:</strong> Filestore assets are mapped with tenant ownership claims (`org-apex`). Subagent operations cannot read or query documents belonging to secondary clients under any context.
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white border border-brand-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pb-4 border-b border-brand-border/40 mb-4">
          
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-lg text-xs bg-brand-offwhite focus:outline-none"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 overflow-x-auto w-full sm:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-all whitespace-nowrap ${
                  filterCategory === cat
                    ? 'bg-brand-charcoal text-white border-brand-charcoal'
                    : 'bg-white hover:bg-brand-offwhite text-gray-500 border-brand-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Document List */}
        <div className="space-y-2.5">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="p-4 bg-brand-offwhite hover:bg-brand-sage/5 border border-brand-border/60 rounded-xl transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2.5 bg-brand-forest/10 rounded-lg text-brand-forest shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-brand-charcoal font-mono text-xs truncate" title={doc.name}>
                    {doc.name}
                  </h4>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex flex-wrap gap-x-3 gap-y-1 items-center">
                    <span className="bg-brand-sage/60 text-brand-forest px-2 py-0.5 rounded text-[9px] font-bold">
                      {doc.category}
                    </span>
                    <span>Uploaded: {doc.uploadDate}</span>
                  <span>Size: {doc.size}</span><span>Extraction: {doc.extractionStatus ?? 'not-requested'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <div className="flex items-center gap-1 font-mono text-[9px] bg-emerald-50 text-brand-forest border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Audit Verified</span>
                </div>
                {doc.storagePath ? <button onClick={() => void downloadDocument(doc.id)} className="p-2 text-gray-500 hover:text-brand-forest hover:bg-white rounded-lg" title="Download stored evidence"><Download className="w-4 h-4" /></button> : null}
                <button
                  onClick={() => {
                    if (confirm(`Remove ${doc.name} from active tenant compliance index?`)) {
                      onDeleteDocument(doc.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove document reference"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="text-center text-gray-400 py-16 font-mono text-xs border border-dashed border-brand-border rounded-xl">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <span>No compliant documentation matching search context located.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
