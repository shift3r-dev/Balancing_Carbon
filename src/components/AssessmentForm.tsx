import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, HelpCircle, FileText, Download } from 'lucide-react';

interface AssessmentQuestion {
  id: string;
  category: string;
  title: string;
  options: { label: string; score: number; text: string }[];
}

const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'q1',
    category: 'Environmental Policy',
    title: 'Does your organisation have a formal, board-approved Environmental Policy for all operating plants?',
    options: [
      { label: 'A', score: 10, text: 'Yes, fully formal, written, board-approved, and revised annually.' },
      { label: 'B', score: 6, text: 'We have a written policy, but it is not board-approved or reviewed regularly.' },
      { label: 'C', score: 2, text: 'We have informal guidelines but no official written environmental policy.' },
      { label: 'D', score: 0, text: 'No policy or environmental guidelines currently exist.' }
    ]
  },
  {
    id: 'q2',
    category: 'Emissions Tracking',
    title: 'Do you systematically calculate and report your Scope 1 (fuel combustion) and Scope 2 (purchased electricity) greenhouse gas emissions?',
    options: [
      { label: 'A', score: 10, text: 'Yes, measured monthly with an auditable calculation engine and active emission factors.' },
      { label: 'B', score: 5, text: 'We track fuel and energy usage in Excel, but do not convert them to carbon dioxide equivalent (tCO2e).' },
      { label: 'C', score: 2, text: 'We track electricity and fuel bills purely for financial bookkeeping, not carbon tracking.' },
      { label: 'D', score: 0, text: 'No, we do not monitor or calculate fuel/emissions data.' }
    ]
  },
  {
    id: 'q3',
    category: 'Renewable Electricity Offset',
    title: 'What percentage of your factory electricity consumption is derived from renewable sources (on-site solar, wind PPAs, or green tariffs)?',
    options: [
      { label: 'A', score: 10, text: 'Greater than 20% renewable share (e.g., active on-site solar arrays or green power agreements).' },
      { label: 'B', score: 6, text: 'Between 5% and 20% renewable share.' },
      { label: 'C', score: 2, text: 'Under 5% renewable share.' },
      { label: 'D', score: 0, text: '0% - Our electricity is completely drawn from standard grid-source power.' }
    ]
  },
  {
    id: 'q4',
    category: 'Regulatory Consent to Operate (CTO)',
    title: 'Are all applicable factory Consent to Operate (CTO) licenses and air/water discharge permits active and fully approved?',
    options: [
      { label: 'A', score: 10, text: 'Yes, all permits are completely active, approved, and updated before expiry.' },
      { label: 'B', score: 6, text: 'All are submitted, but one or more are currently under review/renewal with the State Pollution Control Board.' },
      { label: 'C', score: 3, text: 'We have some missing permits or are currently running on expired consent during appeal.' },
      { label: 'D', score: 0, text: 'No, permits are expired or we do not systematically track pollution board consents.' }
    ]
  },
  {
    id: 'q5',
    category: 'Supplier Ethics & Human Rights',
    title: 'Do you enforce a strict Supplier Code of Conduct (covering child labor, fair wages, safety) on all major material vendors?',
    options: [
      { label: 'A', score: 10, text: 'Yes, we require signed acknowledgements of our Code of Conduct from all primary suppliers.' },
      { label: 'B', score: 5, text: 'We have a written draft Supplier Code of Conduct, but have not distributed it to suppliers.' },
      { label: 'C', score: 2, text: 'We perform informal vendor checks, but have no written code or signed guarantees.' },
      { label: 'D', score: 0, text: 'No, we do not require or track supplier codes of conduct.' }
    ]
  },
  {
    id: 'q6',
    category: 'Governance & Grievance',
    title: 'Does your company maintain an active Whistleblower Policy and an independent operational grievance redressal mechanism?',
    options: [
      { label: 'A', score: 10, text: 'Yes, including anonymous reporting hotlines and formal investigation protocols.' },
      { label: 'B', score: 6, text: 'We have a basic internal grievance channel, but lack anonymous or formal whistleblower avenues.' },
      { label: 'C', score: 2, text: 'Grievances are handled on an ad-hoc, informal basis by the HR team.' },
      { label: 'D', score: 0, text: 'No grievance or whistleblower mechanisms exist.' }
    ]
  }
];

interface AssessmentFormProps {
  onLoginRequest: () => void;
}

export default function AssessmentForm({ onLoginRequest }: AssessmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [uploadedEvidence, setUploadedEvidence] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelectOption = (questionId: string, score: number) => {
    setAnswers({ ...answers, [questionId]: score });
  };

  const handleCommentChange = (questionId: string, text: string) => {
    setComments({ ...comments, [questionId]: text });
  };

  const handleMockUpload = (questionId: string, fileName: string) => {
    setUploadedEvidence({ ...uploadedEvidence, [questionId]: fileName });
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === ASSESSMENT_QUESTIONS.length;

  const totalPossible = ASSESSMENT_QUESTIONS.length * 10;
  const rawScore = (Object.values(answers) as number[]).reduce((sum, s) => sum + s, 0);
  const esgPercentage = Math.round((rawScore / totalPossible) * 100);

  let readinessLevel = 'Critical';
  let levelColor = 'text-brand-red';
  let levelBg = 'bg-red-50 border-red-200';
  let ratingDesc = 'Your organization currently has severe ESG gaps and is highly vulnerable to supply chain audits from OEMs and EU-export audits.';

  if (esgPercentage >= 85) {
    readinessLevel = 'Excellent (BRSR Ready)';
    levelColor = 'text-brand-forest';
    levelBg = 'bg-emerald-50 border-emerald-200';
    ratingDesc = 'Superb alignment! Your business has clean structures ready for OEM auditing and statutory BRSR requirements in India.';
  } else if (esgPercentage >= 60) {
    readinessLevel = 'Good Compliance Structure';
    levelColor = 'text-brand-green-sec';
    levelBg = 'bg-green-50 border-emerald-100';
    ratingDesc = 'Strong core metrics present. You need additional evidentiary documentation and formal supplier distribution to secure high-tier OEM compliance.';
  } else if (esgPercentage >= 35) {
    readinessLevel = 'Needs Immediate Improvement';
    levelColor = 'text-brand-amber';
    levelBg = 'bg-amber-50 border-amber-200';
    ratingDesc = 'Moderate frameworks in place. There are key compliance vulnerabilities regarding pollution board consents and formal carbon intensity tracking.';
  }

  return (
    <div className="bg-white rounded-xl border border-brand-border shadow-sm p-6 max-w-4xl mx-auto" id="assessment-widget">
      {!isSubmitted ? (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-brand-forest/10 rounded-lg text-brand-forest">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-charcoal">Free B2B ESG Readiness Assessment</h2>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Evaluation aligned with Tata Motors, Mahindra, and major global OEM sustainability matrices
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-gray-500 font-mono mb-2">
              <span>Progress: {answeredCount} of {ASSESSMENT_QUESTIONS.length} Answered</span>
              <span>{Math.round((answeredCount / ASSESSMENT_QUESTIONS.length) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-brand-offwhite rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-forest transition-all duration-300" 
                style={{ width: `${(answeredCount / ASSESSMENT_QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Questions Stack */}
          <div className="space-y-8">
            {ASSESSMENT_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="p-5 bg-brand-offwhite rounded-lg border border-brand-border/60">
                <div className="flex justify-between items-start gap-3 mb-4">
                  <span className="text-[10px] uppercase font-mono bg-brand-sage text-brand-forest px-2 py-0.5 rounded font-semibold">
                    {q.category}
                  </span>
                  <span className="text-xs font-mono text-gray-400">Indicator 0{idx + 1}</span>
                </div>
                <h3 className="font-medium text-brand-charcoal text-sm leading-snug mb-4">{q.title}</h3>

                {/* Option Selector */}
                <div className="grid grid-cols-1 gap-2.5">
                  {q.options.map((opt) => {
                    const isSelected = answers[q.id] === opt.score;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt.score)}
                        className={`text-left p-3.5 text-xs rounded-lg border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-brand-forest text-white border-brand-forest font-medium'
                            : 'bg-white hover:bg-brand-sage/20 border-brand-border/80 text-gray-700'
                        }`}
                      >
                        <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 border-white text-white' : 'bg-brand-offwhite border-brand-border text-gray-500'
                        }`}>
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Contextual comment / upload simulation */}
                {answers[q.id] !== undefined && (
                  <div className="mt-4 pt-4 border-t border-brand-border/40 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-gray-500 mb-1">Evidence Summary / Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Document #APEX-ENV-2025 rev 3"
                        value={comments[q.id] || ''}
                        onChange={(e) => handleCommentChange(q.id, e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-brand-border rounded focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-500 mb-1">Evidentiary File Linkage (Optional)</label>
                      {uploadedEvidence[q.id] ? (
                        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 text-brand-forest rounded text-xs">
                          <span className="truncate font-mono font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {uploadedEvidence[q.id]}
                          </span>
                          <button 
                            onClick={() => handleMockUpload(q.id, '')} 
                            className="text-brand-red font-mono text-[10px] hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleMockUpload(q.id, `${q.category.replace(' ', '_')}_Evidence.pdf`)}
                            className="flex-1 bg-white border border-dashed border-brand-border text-gray-600 hover:bg-brand-sage/10 text-[11px] font-mono p-2 rounded text-center"
                          >
                            Attach Evidence PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between items-center border-t border-brand-border pt-6">
            <div className="text-xs text-gray-500 max-w-md">
              Complete all questions to unlock your ESG readiness matrix, carbon calculations framework, and detailed action report.
            </div>
            <button
              onClick={() => setIsSubmitted(true)}
              disabled={!isComplete}
              className={`px-6 py-3 rounded-lg font-medium text-xs flex items-center gap-2 transition-all ${
                isComplete
                  ? 'bg-brand-forest hover:bg-brand-green-sec text-white cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              Calculate ESG Score <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-brand-forest/10 text-brand-forest rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-1">Assessment Generated Successfully</h2>
          <p className="text-xs font-mono text-gray-500 mb-6">Provisional Audit Report ID: BC-ESG-{Math.floor(Math.random() * 90000) + 10000}</p>

          {/* Results Block */}
          <div className={`p-6 border rounded-xl mb-8 max-w-2xl mx-auto ${levelBg}`}>
            <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500">Your ESG Readiness Index</span>
            <div className="text-5xl font-black font-mono tracking-tight mt-1 mb-2 text-brand-charcoal">
              {esgPercentage}%
            </div>
            <div className={`font-mono text-sm font-semibold uppercase tracking-wide ${levelColor}`}>
              Maturity Level: {readinessLevel}
            </div>
            <p className="text-xs text-gray-600 mt-3 leading-relaxed max-w-lg mx-auto">
              {ratingDesc}
            </p>
          </div>

          {/* Key Findings / Recommendation Cards */}
          <div className="max-w-2xl mx-auto text-left mb-8 space-y-4">
            <h3 className="font-bold text-sm text-brand-charcoal uppercase tracking-wider font-mono">Critical ESG Gaps Found:</h3>
            <div className="space-y-2">
              {answers['q2'] < 10 && (
                <div className="flex gap-3 p-3 bg-red-50/50 border border-brand-red/20 rounded-lg text-xs text-gray-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-brand-red mt-0.5" />
                  <div>
                    <strong className="text-brand-charcoal block">Scope 1 & 2 Emissions Ledger Gaps</strong>
                    Your carbon accounting is partial or spreadsheet-based. Leading auto-OEMs (Tata, Maruti Suzuki) require auditable GHG calculation sheets with strict emission factor methodologies (CEA Grid and IPCC Stationary values).
                  </div>
                </div>
              )}
              {answers['q5'] < 10 && (
                <div className="flex gap-3 p-3 bg-amber-50/50 border border-brand-amber/20 rounded-lg text-xs text-gray-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-brand-amber mt-0.5" />
                  <div>
                    <strong className="text-brand-charcoal block">Incomplete Supplier Compliance Framework</strong>
                    A draft Supplier Code of Conduct is not legally sufficient. To satisfy export requirements (EU CSRD / CBAM), suppliers must physically execute environmental compliance guarantees.
                  </div>
                </div>
              )}
              {answers['q4'] < 10 && (
                <div className="flex gap-3 p-3 bg-amber-50/50 border border-brand-amber/20 rounded-lg text-xs text-gray-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-brand-amber mt-0.5" />
                  <div>
                    <strong className="text-brand-charcoal block">Pollution Consent (CTO) Risk Trackers</strong>
                    Operating with pending pollution permits exposes facilities to local compliance penalties. Maintain a formal digital tracking sheet.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call to action */}
          <div className="max-w-xl mx-auto p-5 bg-brand-charcoal text-white rounded-xl text-left border border-black/10 shadow-lg">
            <h4 className="font-bold text-sm mb-2">Claim Your Full Dashboard Access</h4>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              Unlock our **Carbon Calculation Engine**, digital **Document Evidence Lockers**, auto-generated **OEM questionnaire answers**, and the **Balancing Carbon AI Assistant** using your real industrial assets.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onLoginRequest}
                className="flex-1 bg-brand-forest hover:bg-brand-green-sec text-white py-2.5 px-4 rounded-lg text-xs font-bold font-mono transition-all text-center flex items-center justify-center gap-1"
              >
                Persist & Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => window.print()}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/20 py-2.5 px-4 rounded-lg text-xs font-mono font-bold transition-all text-center flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Print Audit Sheet
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setAnswers({});
              setComments({});
              setUploadedEvidence({});
              setIsSubmitted(false);
            }}
            className="text-xs font-mono text-brand-forest mt-6 block mx-auto hover:underline"
          >
            Start New Free Assessment
          </button>
        </div>
      )}
    </div>
  );
}
