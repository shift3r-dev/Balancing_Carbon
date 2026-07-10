import React, { useState } from 'react';
import { 
  ShieldAlert, Sparkles, AlertCircle, CheckCircle2, ChevronDown, 
  ChevronUp, HelpCircle, Save, FileText, CheckCircle, Plus 
} from 'lucide-react';
import { ESGQuestion } from '../types.ts';

interface ESGProps {
  questions: ESGQuestion[];
  onUpdateQuestion: (id: string, updates: any) => void;
  documents: { id: string, name: string }[];
}

const calculateAverageScore = (questions: ESGQuestion[]): number => {
  const validScores = questions
    .map((question) => Number(question.score))
    .filter((score) => Number.isFinite(score));

  if (validScores.length === 0) return 0;

  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
};

const clampPercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

export default function ESGAssessmentModule({ questions, onUpdateQuestion, documents }: ESGProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Environmental' | 'Social' | 'Governance' | 'Compliance'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Editable states for the active expanded question
  const [editAnswer, setEditAnswer] = useState('');
  const [editEvidence, setEditEvidence] = useState('');
  const [editScore, setEditScore] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'Compliant' | 'Partial' | 'Non-Compliant' | 'Not Applicable'>('Compliant');

  const categories = ['All', 'Environmental', 'Social', 'Governance', 'Compliance'];

  // Calculations
  const averageScore = calculateAverageScore(questions);
  
  const categoryScores = {
    Environmental: calculateAverageScore(questions.filter(q => q.category === 'Environmental' || q.category === 'Carbon' || q.category === 'Energy')),
    Social: calculateAverageScore(questions.filter(q => q.category === 'Social')),
    Governance: calculateAverageScore(questions.filter(q => q.category === 'Governance')),
    Compliance: calculateAverageScore(questions.filter(q => q.category === 'Compliance')),
  };

  const outOfRangeScoreCount = questions
    .map((question) => Number(question.score))
    .filter((score) => Number.isFinite(score) && (score < 0 || score > 100))
    .length;

  const filteredQuestions = questions.filter(q => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Environmental') {
      return q.category === 'Environmental' || q.category === 'Carbon' || q.category === 'Energy';
    }
    return q.category === activeCategory;
  });

  const handleExpand = (q: ESGQuestion) => {
    if (expandedId === q.id) {
      setExpandedId(null);
    } else {
      setExpandedId(q.id);
      setEditAnswer(q.answer);
      setEditEvidence(q.evidence);
      setEditScore(q.score);
      setEditStatus(q.status);
    }
  };

  const handleSave = (id: string) => {
    onUpdateQuestion(id, {
      answer: editAnswer,
      evidence: editEvidence,
      score: editScore,
      status: editStatus,
      reviewStatus: 'Approved'
    });
    setExpandedId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="bg-white p-5 rounded-xl border border-brand-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal">ESG Readiness Matrix</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Audit-ready ESG indicators conforming to SEBI BRSR Core guidelines and global supplier standards.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs bg-brand-charcoal text-white px-3 py-1.5 rounded-lg">
          <Sparkles className="w-4 h-4 text-brand-sage animate-pulse" />
          <span>BRSR Readiness Score: <strong>{averageScore.toFixed(1)}%</strong></span>
        </div>
      </div>

      {outOfRangeScoreCount > 0 && (
        <div className="bg-amber-50 border border-brand-amber/30 text-brand-amber rounded-xl px-4 py-3 text-xs font-mono">
          {outOfRangeScoreCount} ESG score value{outOfRangeScoreCount === 1 ? '' : 's'} fall outside the expected 0-100 range. Scores are shown as stored; progress bars are visually clamped.
        </div>
      )}

      {/* Category Breakdowns Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-brand-border flex flex-col justify-between">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">Environmental Hub</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-brand-charcoal">{categoryScores.Environmental.toFixed(1)}%</span>
            <span className="text-[9px] font-mono text-brand-forest">E-Indicator</span>
          </div>
          <div className="h-1 bg-brand-border rounded-full overflow-hidden mt-2">
            <div className="h-full bg-brand-forest" style={{ width: `${clampPercentage(categoryScores.Environmental)}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-brand-border flex flex-col justify-between">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">Social Responsibility</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-brand-charcoal">{categoryScores.Social.toFixed(1)}%</span>
            <span className="text-[9px] font-mono text-brand-green-sec">S-Indicator</span>
          </div>
          <div className="h-1 bg-brand-border rounded-full overflow-hidden mt-2">
            <div className="h-full bg-brand-green-sec" style={{ width: `${clampPercentage(categoryScores.Social)}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-brand-border flex flex-col justify-between">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">Governance & Integrity</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-brand-charcoal">{categoryScores.Governance.toFixed(1)}%</span>
            <span className="text-[9px] font-mono text-brand-charcoal">G-Indicator</span>
          </div>
          <div className="h-1 bg-brand-border rounded-full overflow-hidden mt-2">
            <div className="h-full bg-brand-charcoal" style={{ width: `${clampPercentage(categoryScores.Governance)}%` }} />
          </div>
        </div>

        <div className="bg-brand-charcoal text-white p-4 rounded-xl border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-brand-sage uppercase tracking-wider font-semibold">Regulatory Compliance</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black font-mono tracking-tight text-brand-sage">{categoryScores.Compliance.toFixed(1)}%</span>
            <span className="text-[9px] font-mono text-brand-amber">CTO Permits</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-brand-amber" style={{ width: `${clampPercentage(categoryScores.Compliance)}%` }} />
          </div>
        </div>

      </div>

      {/* Category Selection Filter tabs */}
      <div className="flex gap-1.5 border-b border-brand-border/60 pb-1 text-xs">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat as any);
              setExpandedId(null);
            }}
            className={`px-4 py-2 font-mono font-bold transition-all border-b-2 -mb-1.5 ${
              activeCategory === cat 
                ? 'border-brand-forest text-brand-forest font-extrabold' 
                : 'border-transparent text-gray-400 hover:text-brand-charcoal'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Indicators Accordion list */}
      <div className="space-y-4">
        {filteredQuestions.map(q => {
          const isExpanded = expandedId === q.id;
          return (
            <div key={q.id} className="bg-white border border-brand-border rounded-xl overflow-hidden shadow-sm">
              
              {/* Header block */}
              <div 
                onClick={() => handleExpand(q)}
                className="p-4 flex justify-between items-center gap-4 cursor-pointer hover:bg-brand-offwhite/50 transition-colors"
              >
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center border font-mono font-bold text-[10px] ${
                    q.status === 'Compliant' ? 'bg-emerald-50 text-brand-forest border-brand-forest' :
                    q.status === 'Partial' ? 'bg-amber-50 text-brand-amber border-brand-amber' :
                    'bg-red-50 text-brand-red border-brand-red'
                  }`}>
                    {q.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] uppercase font-mono bg-brand-sage text-brand-forest px-1.5 py-0.5 rounded font-bold mr-2">
                      {q.category}
                    </span>
                    <span className="text-xs font-semibold text-brand-charcoal truncate block mt-1">{q.question}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    q.reviewStatus === 'Approved' ? 'bg-emerald-100 text-brand-forest' :
                    q.reviewStatus === 'In Review' ? 'bg-amber-100 text-brand-amber' :
                    'bg-red-100 text-brand-red'
                  }`}>
                    {q.reviewStatus}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Collapsed Detailed Block */}
              {isExpanded && (
                <div className="border-t border-brand-border/60 bg-brand-offwhite/30 p-5 space-y-4 text-xs animate-in slide-in-from-top-1 duration-150">
                  
                  {/* Current info grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-gray-400 block uppercase">Committed Response</span>
                      <p className="text-gray-700 bg-white p-3 rounded-lg border border-brand-border leading-relaxed text-[11px]">
                        {q.answer || <span className="text-gray-400 italic">No response drafted yet. Expand editor below to initiate.</span>}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-gray-400 block uppercase">Evidence Documents</span>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-brand-forest font-bold">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>{q.evidence || 'No evidence PDF linked yet'}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-brand-sage/15 border border-brand-border rounded-lg">
                        <strong className="text-brand-forest block text-[10px] font-mono uppercase">Decarbonization Recommendation:</strong>
                        <p className="text-gray-600 text-[11px] mt-0.5 leading-snug">{q.recommendation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Editor */}
                  <div className="border-t border-brand-border/50 pt-4 space-y-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-brand-charcoal block">
                      Edit Response & Evidence Links
                    </span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block font-mono text-gray-400 mb-1">Response Answer</label>
                        <textarea
                          rows={3}
                          className="w-full border border-brand-border p-2.5 rounded text-xs bg-white focus:ring-1 focus:ring-brand-forest"
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block font-mono text-gray-400 mb-1">Maturity Score (0-100)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full border border-brand-border p-2 rounded bg-white text-xs font-mono"
                            value={editScore}
                            onChange={(e) => setEditScore(Number(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-gray-400 mb-1">Document Evidence Association</label>
                          <select
                            value={editEvidence}
                            onChange={(e) => setEditEvidence(e.target.value)}
                            className="w-full border border-brand-border p-2 rounded bg-white text-xs font-mono"
                          >
                            <option value="">Select Document</option>
                            {documents.map(d => (
                              <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2 text-xs font-mono">
                        <span className="text-gray-400">Compliance Status:</span>
                        {(['Compliant', 'Partial', 'Non-Compliant'] as const).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setEditStatus(st)}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-all ${
                              editStatus === st 
                                ? 'bg-brand-charcoal text-white border-brand-charcoal font-bold' 
                                : 'bg-white text-gray-500 border-brand-border'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => handleSave(q.id)}
                        className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-2 rounded font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Commit Audit Edits
                      </button>
                    </div>

                  </div>

                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
