import React, { useState } from 'react';
import { 
  FileCheck, FileText, Upload, Sparkles, CheckCircle, AlertTriangle, 
  Search, ShieldAlert, ArrowRight, UserCheck, X, HelpCircle 
} from 'lucide-react';
import { OEMQuestionnaire } from '../types.ts';

interface OEMProps {
  surveys: OEMQuestionnaire[];
  onAddSurvey: (title: string, oemName: string, dueDate: string) => void;
  onApproveQuestion: (surveyId: string, questionId: string, status: any, suggestedAnswer?: string) => void;
}

export default function OEMQuestionnaireModule({ surveys, onAddSurvey, onApproveQuestion }: OEMProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [oemName, setOemName] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Selected survey explorer
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(surveys[0]?.id || '');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Editable answer state
  const [editAnswerText, setEditAnswerText] = useState('');

  const activeSurvey = surveys.find(s => s.id === selectedSurveyId) || surveys[0];

  const handleCreateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !oemName || !dueDate) {
      alert('Please fill out all survey metrics.');
      return;
    }
    onAddSurvey(title, oemName, dueDate);
    setShowAddModal(false);
    setTitle('');
    setOemName('');
    setDueDate('');
  };

  const handleExpandQuestion = (q: any) => {
    if (expandedQuestionId === q.id) {
      setExpandedQuestionId(null);
    } else {
      setExpandedQuestionId(q.id);
      setEditAnswerText(q.suggestedAnswer);
    }
  };

  const handleSaveApprove = (surveyId: string, qId: string) => {
    onApproveQuestion(surveyId, qId, 'Approved', editAnswerText);
    setExpandedQuestionId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Title banner */}
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-brand-border">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal">OEM Questionnaires</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Auto-classify requirements, map evidence files, draft answers, and verify before external submission.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" /> Ingest OEM Questionnaire
        </button>
      </div>

      {/* Select Active Survey Tab Row */}
      {surveys.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-mono font-bold">
          {surveys.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSurveyId(s.id);
                setExpandedQuestionId(null);
              }}
              className={`px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                selectedSurveyId === s.id 
                  ? 'bg-brand-charcoal text-brand-sage border-brand-charcoal' 
                  : 'bg-white text-gray-500 hover:bg-brand-offwhite border-brand-border'
              }`}
            >
              {s.oemName} Survey
            </button>
          ))}
        </div>
      )}

      {/* Survey Workflow Container */}
      {activeSurvey ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of individual extracted questions */}
          <div className="bg-white border border-brand-border rounded-xl p-5 lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center border-b border-brand-border/60 pb-3">
              <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal">
                Extracted Questions ({activeSurvey.questions.length})
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">Due: {activeSurvey.dueDate}</span>
            </div>

            <div className="space-y-3">
              {activeSurvey.questions.map((q, idx) => {
                const isExpanded = expandedQuestionId === q.id;
                return (
                  <div key={q.id} className="border border-brand-border/60 rounded-lg overflow-hidden bg-brand-offwhite/20">
                    
                    {/* Header trigger */}
                    <div 
                      onClick={() => handleExpandQuestion(q)}
                      className="p-3.5 bg-white hover:bg-brand-offwhite/50 transition-colors flex justify-between items-center gap-3 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 flex items-start gap-3">
                        <span className="text-xs font-mono text-gray-400">Q0{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[8px] uppercase font-mono bg-brand-sage text-brand-forest px-1.5 py-0.5 rounded font-bold mr-2">
                            {q.category}
                          </span>
                          <span className="text-xs font-semibold text-brand-charcoal block mt-1 leading-relaxed">{q.question}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          q.status === 'Approved' ? 'bg-emerald-100 text-brand-forest' :
                          q.status === 'Ready for Review' ? 'bg-amber-100 text-brand-amber' : 'bg-red-100 text-brand-red'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Editor Workspace */}
                    {isExpanded && (
                      <div className="p-4 bg-brand-offwhite/40 border-t border-brand-border/50 space-y-4 text-xs animate-in slide-in-from-top-1 duration-150">
                        
                        {/* Suggested Response and confidence */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-1">
                            <span className="text-[9px] font-mono uppercase text-gray-400 block font-bold">AI Recommended Draft</span>
                            <textarea
                              rows={4}
                              className="w-full bg-white border border-brand-border rounded-lg p-3 text-xs leading-relaxed text-gray-700"
                              value={editAnswerText}
                              onChange={(e) => setEditAnswerText(e.target.value)}
                            />
                          </div>

                          <div className="space-y-3 font-mono text-[11px]">
                            <div className="p-3 bg-brand-sage/10 border border-brand-border rounded-lg">
                              <span className="text-[9px] text-gray-400 block uppercase">Draft Confidence</span>
                              <strong className={`font-bold uppercase text-xs ${
                                q.confidence === 'High' ? 'text-brand-forest' : 'text-brand-amber'
                              }`}>
                                {q.confidence} Confidence
                              </strong>
                              <p className="text-[10px] text-gray-500 mt-1 font-sans leading-tight">
                                Sourced from registered corporate environmental plans and Chakan facility electricity entries.
                              </p>
                            </div>

                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">Evidentiary Citations</span>
                              <div className="flex items-center gap-1 mt-1 text-brand-forest font-bold">
                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                <span>{q.evidenceSource}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-brand-border/40">
                          <button
                            onClick={() => onApproveQuestion(activeSurvey.id, q.id, 'Flagged')}
                            className="bg-white hover:bg-gray-50 text-brand-amber border border-brand-border px-3.5 py-1.5 rounded font-mono font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Flag for ESG Reviewer
                          </button>
                          <button
                            onClick={() => handleSaveApprove(activeSurvey.id, q.id)}
                            className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-1.5 rounded font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Approve & Lock Response
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

          {/* Guidelines Sidebar summary */}
          <div className="space-y-6">
            
            {/* Core Principle card */}
            <div className="bg-brand-charcoal text-white p-5 rounded-xl border border-white/5 space-y-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-brand-forest/15 rounded-full blur-2xl pointer-events-none" />
              <h4 className="text-xs font-bold font-mono text-brand-sage uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-brand-forest animate-pulse" /> Core Standard Workflow
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed font-mono">
                AI DRAFTS. HUMANS APPROVE.
              </p>
              <p className="text-xs text-gray-400 leading-normal">
                All generated suggestions are draft options extracted using vector indices across your physical logs and policy PDFs. No responses are automatically dispatched or verified without the physical stamp of a registered Organisation Admin.
              </p>
            </div>

            {/* Simulated Survey Uploader drag zone */}
            <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-brand-charcoal">Quick Ingestion Zone</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Received a new compliance sheet? Drag the spreadsheet or PDF survey here to extract and categorize questions in 15 seconds.
              </p>
              <div className="border border-dashed border-brand-border bg-brand-offwhite rounded-lg p-5 text-center hover:bg-brand-sage/10 transition-all cursor-pointer">
                <Upload className="w-6 h-6 text-brand-forest mx-auto mb-2 opacity-50" />
                <span className="text-xs font-bold text-brand-charcoal block">Drop Questionnaire</span>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Excel, PDF, Word</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white border border-brand-border rounded-xl p-12 text-center">
          <FileCheck className="w-12 h-12 text-brand-forest/35 mx-auto mb-3" />
          <h3 className="font-bold text-brand-charcoal">No Active Survey Questionnaires Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-normal">
            Ingest an OEM supplier compliance template to extract indices and generate evidence-backed draft answers.
          </p>
        </div>
      )}

      {/* Add Survey Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[1000]">
          <div className="bg-white rounded-xl border border-brand-border shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center bg-brand-charcoal text-white p-4">
              <h3 className="font-bold text-sm font-mono uppercase tracking-wider">Ingest New OEM Survey</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSurvey} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-mono text-gray-500 mb-1">Survey Sheet Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahindra Scope 3 ESG Survey"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite"
                />
              </div>
              <div>
                <label className="block font-mono text-gray-500 mb-1">OEM Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahindra & Mahindra Ltd."
                  value={oemName}
                  onChange={(e) => setOemName(e.target.value)}
                  className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite"
                />
              </div>
              <div>
                <label className="block font-mono text-gray-500 mb-1">Filing Due Date *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-brand-border p-2.5 rounded text-xs bg-brand-offwhite font-mono"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded text-[10px] font-mono text-brand-forest leading-relaxed">
                <strong>Automatic Processing:</strong> Extraction engine automatically structures questions, mapping them against available environmental policies and electricity log sheets.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-forest hover:bg-brand-green-sec text-white rounded text-xs font-bold cursor-pointer"
                >
                  Ingest & Process
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
