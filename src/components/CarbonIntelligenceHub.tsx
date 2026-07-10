import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ClipboardList, Factory, Lightbulb, Play, Target } from 'lucide-react';
import {
  DataCompletenessResult,
  DecarbonizationProject,
  DiagnosticFinding,
  DiagnosticQuestionResponse,
  Facility,
  MonthComparison,
  ReductionOpportunity,
  ReductionScenario,
} from '../types.ts';

interface CarbonIntelligenceProps {
  facilities: Facility[];
  findings: DiagnosticFinding[];
  completeness: DataCompletenessResult | null;
  comparison: MonthComparison | null;
  diagnosticResponses: DiagnosticQuestionResponse[];
  opportunities: ReductionOpportunity[];
  scenarios: ReductionScenario[];
  projects: DecarbonizationProject[];
  onRefreshDiagnostics: (params?: { facilityId?: string; startDate?: string; endDate?: string; currentMonth?: string; previousMonth?: string }) => void;
  onSaveDiagnosticResponse: (payload: any) => void;
  onCreateOpportunity: (payload: any) => void;
  onCreateScenario: (payload: any) => void;
  onCreateProject: (payload: any) => void;
}

const questionGroups = [
  {
    category: 'Compressed Air',
    questions: [
      { questionId: 'compressed-air-used', questionText: 'Does the facility use compressed air?' },
      { questionId: 'compressed-air-leak-survey', questionText: 'Has a compressed-air leak survey been completed in the last 12 months?' },
    ],
  },
  {
    category: 'Energy Management',
    questions: [
      { questionId: 'energy-monthly-monitoring', questionText: 'Does the facility monitor electricity consumption monthly?' },
      { questionId: 'energy-major-machine-submetering', questionText: 'Are major machines individually sub-metered?' },
      { questionId: 'monthly-deviations-investigated', questionText: 'Are monthly deviations investigated?' },
    ],
  },
  {
    category: 'Process Heating',
    questions: [
      { questionId: 'process-heating-used', questionText: 'Does the facility use furnaces, boilers, ovens, or other thermal processes?' },
      { questionId: 'waste-heat-recovery', questionText: 'Is exhaust or waste heat recovery used?' },
    ],
  },
];

const scenarioLabels: Record<string, string> = {
  'grid-electricity-reduction': 'Grid electricity reduction',
  'diesel-reduction': 'Diesel reduction',
  'renewable-electricity-substitution': 'Renewable substitution',
  'production-normalized-efficiency': 'Production-normalized efficiency',
};

export default function CarbonIntelligenceHub({
  facilities,
  findings,
  completeness,
  comparison,
  diagnosticResponses,
  opportunities,
  scenarios,
  projects,
  onRefreshDiagnostics,
  onSaveDiagnosticResponse,
  onCreateOpportunity,
  onCreateScenario,
  onCreateProject,
}: CarbonIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'opportunities' | 'scenarios' | 'projects'>('diagnostics');
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || '');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-04-30');
  const [currentMonth, setCurrentMonth] = useState('2026-04');
  const [previousMonth, setPreviousMonth] = useState('2026-03');
  const [scenarioType, setScenarioType] = useState<ReductionScenario['scenarioType']>('grid-electricity-reduction');
  const [scenarioPercent, setScenarioPercent] = useState('10');

  const responseLookup = useMemo(() => {
    const lookup = new Map<string, DiagnosticQuestionResponse>();
    diagnosticResponses.forEach((response) => lookup.set(`${response.facilityId || ''}:${response.questionId}`, response));
    return lookup;
  }, [diagnosticResponses]);

  const selectedFacility = facilities.find((facility) => facility.id === facilityId);
  const topFindings = findings.slice(0, 5);

  const handleDiagnosticRun = () => {
    onRefreshDiagnostics({ facilityId: facilityId || undefined, startDate, endDate, currentMonth, previousMonth });
  };

  const handleQuestionAnswer = (question: { questionId: string; questionText: string }, category: string, answer: string) => {
    onSaveDiagnosticResponse({
      facilityId,
      questionId: question.questionId,
      category,
      questionText: question.questionText,
      answer,
    });
  };

  const createOpportunityFromFinding = (finding: DiagnosticFinding) => {
    onCreateOpportunity({
      facilityId: finding.facilityId || facilityId,
      diagnosticFindingId: finding.id,
      title: finding.title,
      category: finding.category,
      source: 'diagnostic',
      description: finding.description,
      rationale: `Created from ${finding.findingType} finding. Engineering assessment required before quantitative savings are claimed.`,
      confidence: finding.findingType === 'fact' ? 'high' : 'medium',
      engineeringAssessmentRequired: finding.findingType !== 'fact',
    });
  };

  const createScenario = () => {
    const assumptionKey = scenarioType === 'renewable-electricity-substitution'
      ? 'substitutionPercent'
      : scenarioType === 'production-normalized-efficiency'
        ? 'improvementPercent'
        : 'reductionPercent';
    onCreateScenario({
      facilityId,
      title: `${scenarioLabels[scenarioType]} - ${scenarioPercent}%`,
      baselineStartDate: startDate,
      baselineEndDate: endDate,
      scenarioType,
      assumptions: { [assumptionKey]: Number(scenarioPercent) },
    });
  };

  const createProjectFromScenario = (scenario: ReductionScenario) => {
    onCreateProject({
      facilityId: scenario.facilityId || facilityId,
      scenarioId: scenario.id,
      title: scenario.title,
      category: scenarioLabels[scenario.scenarioType],
      description: 'Project created from transparent scenario model. Actual results require post-implementation measurement.',
      status: 'planned',
      baselineStartDate: scenario.baselineStartDate,
      baselineEndDate: scenario.baselineEndDate,
      targetAnnualReductionTCO2e: scenario.estimatedReductionTCO2e * 12,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-brand-border rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-brand-charcoal">Carbon Intelligence & Decarbonization</h1>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Diagnostics, opportunities, scenarios, projects, and expected-vs-observed tracking from operational records.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          <select value={facilityId} onChange={(event) => setFacilityId(event.target.value)} className="border border-brand-border rounded p-2 bg-brand-offwhite font-mono col-span-2">
            <option value="">All Facilities</option>
            {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
          </select>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="border border-brand-border rounded p-2 bg-brand-offwhite font-mono" />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="border border-brand-border rounded p-2 bg-brand-offwhite font-mono" />
          <button onClick={handleDiagnosticRun} className="bg-brand-forest text-white rounded px-3 py-2 font-mono font-bold flex items-center justify-center gap-1">
            <Play className="w-3.5 h-3.5" /> Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'diagnostics', label: 'Diagnostics', icon: ClipboardList },
          { key: 'opportunities', label: 'Opportunities', icon: Lightbulb },
          { key: 'scenarios', label: 'Scenarios', icon: BarChart3 },
          { key: 'projects', label: 'Projects', icon: Target },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`rounded-xl border p-3 text-left text-xs font-mono font-bold flex items-center gap-2 ${activeTab === tab.key ? 'bg-brand-charcoal text-white border-brand-charcoal' : 'bg-white border-brand-border text-brand-charcoal'}`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Metric label="Activity Coverage" value={`${completeness?.activityCoveragePercent ?? 0}%`} />
              <Metric label="Production Coverage" value={`${completeness?.productionCoveragePercent ?? 0}%`} />
              <Metric label="Questionnaire" value={`${completeness?.questionnaireCompletionPercent ?? 0}%`} />
            </div>
            {comparison && (
              <div className="bg-white border border-brand-border rounded-xl p-5">
                <h2 className="text-sm font-bold font-mono uppercase text-brand-charcoal mb-3">Why Performance Changed</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <Metric label="Grid Electricity Change" value={`${comparison.electricityChangePercent}%`} />
                  <Metric label="Production Change" value={comparison.productionChangePercent === null ? 'Missing' : `${comparison.productionChangePercent}%`} />
                  <Metric label="Electricity Intensity Change" value={comparison.electricityIntensityChangePercent === null ? 'Missing' : `${comparison.electricityIntensityChangePercent}%`} />
                </div>
                {comparison.warnings.map((warning) => <p key={warning} className="mt-3 text-[11px] text-brand-amber font-mono">{warning}</p>)}
              </div>
            )}
            <div className="bg-white border border-brand-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold font-mono uppercase text-brand-charcoal">Explainable Findings</h2>
              {topFindings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} onConvert={() => createOpportunityFromFinding(finding)} />
              ))}
              {topFindings.length === 0 && <Empty text="Run diagnostics after adding activity records to generate findings." />}
            </div>
          </div>
          <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold font-mono uppercase text-brand-charcoal">Industry Questionnaire</h2>
            <p className="text-xs text-gray-500">Template: Automotive Components / Precision Engineering</p>
            {questionGroups.map((group) => (
              <div key={group.category} className="border-t border-brand-border/60 pt-3">
                <h3 className="text-[11px] font-mono font-bold text-brand-forest uppercase mb-2">{group.category}</h3>
                <div className="space-y-3">
                  {group.questions.map((question) => {
                    const existing = responseLookup.get(`${facilityId}:${question.questionId}`)?.answer ?? '';
                    return (
                      <label key={question.questionId} className="block text-xs text-brand-charcoal">
                        <span className="block mb-1 leading-snug">{question.questionText}</span>
                        <select value={existing} onChange={(event) => handleQuestionAnswer(question, group.category, event.target.value)} className="w-full border border-brand-border rounded p-2 bg-brand-offwhite font-mono text-xs">
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="not-applicable">Not applicable</option>
                        </select>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {opportunities.map((opportunity) => (
            <div key={opportunity.id} className="bg-white border border-brand-border rounded-xl p-5 text-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-brand-charcoal">{opportunity.title}</h3>
                <span className="font-mono uppercase text-[9px] bg-brand-sage text-brand-forest px-2 py-0.5 rounded">{opportunity.status}</span>
              </div>
              <p className="text-gray-600 leading-relaxed">{opportunity.rationale}</p>
              <div className="font-mono text-gray-400">{opportunity.engineeringAssessmentRequired ? 'Engineering assessment required' : 'Quantified scenario available'}</div>
              <button onClick={() => onCreateProject({ facilityId: opportunity.facilityId, opportunityId: opportunity.id, title: opportunity.title, description: opportunity.description, category: opportunity.category, status: 'planned' })} className="w-full bg-brand-charcoal text-white rounded p-2 font-mono font-bold flex items-center justify-center gap-1">
                Convert to Project <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {opportunities.length === 0 && <Empty text="Convert a finding to create the first reduction opportunity." />}
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold font-mono uppercase text-brand-charcoal">Scenario Modeller</h2>
            <select value={scenarioType} onChange={(event) => setScenarioType(event.target.value as any)} className="w-full border border-brand-border rounded p-2 bg-brand-offwhite text-xs font-mono">
              {Object.entries(scenarioLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <input type="number" min="0" max="100" value={scenarioPercent} onChange={(event) => setScenarioPercent(event.target.value)} className="w-full border border-brand-border rounded p-2 bg-brand-offwhite text-xs font-mono" />
            <button onClick={createScenario} className="w-full bg-brand-forest text-white rounded p-2 font-mono font-bold">Save Scenario</button>
            <p className="text-[11px] text-gray-500 leading-relaxed">Scenarios never modify actual activity records. All formulas and factor provenance are saved in calculation metadata.</p>
          </div>
          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="bg-white border border-brand-border rounded-xl p-5 text-xs space-y-3">
                <h3 className="font-bold text-brand-charcoal">{scenario.title}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Baseline" value={scenario.baselineEmissionsTCO2e.toFixed(2)} />
                  <Metric label="Scenario" value={scenario.scenarioEmissionsTCO2e.toFixed(2)} />
                  <Metric label="Reduction" value={scenario.estimatedReductionTCO2e.toFixed(2)} />
                </div>
                <pre className="bg-brand-offwhite rounded p-3 overflow-auto text-[10px] text-gray-500 max-h-32">{JSON.stringify(scenario.calculationMetadata, null, 2)}</pre>
                <button onClick={() => createProjectFromScenario(scenario)} className="w-full bg-brand-charcoal text-white rounded p-2 font-mono font-bold">Convert to Project</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const completed = project.milestones?.filter((milestone) => milestone.status === 'completed').length ?? 0;
            const total = project.milestones?.length ?? 0;
            const latestMeasurement = project.measurements?.[0];
            return (
              <div key={project.id} className="bg-white border border-brand-border rounded-xl p-5 text-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-brand-charcoal">{project.title}</h3>
                  <span className="font-mono uppercase text-[9px] bg-brand-sage text-brand-forest px-2 py-0.5 rounded">{project.status}</span>
                </div>
                <p className="text-gray-600">{project.description}</p>
                <div className="font-mono text-gray-500">Milestones: {completed}/{total}</div>
                {latestMeasurement ? (
                  <div className="bg-brand-offwhite border border-brand-border rounded p-3">
                    <div className="font-bold text-brand-charcoal">Observed performance change</div>
                    <div className="mt-1">Expected {latestMeasurement.expectedReductionPercent}% | Observed {latestMeasurement.observedImprovementPercent}% | Variance {latestMeasurement.variancePercentagePoints} pp</div>
                  </div>
                ) : (
                  <div className="text-gray-400 font-mono">No post-implementation measurement yet.</div>
                )}
              </div>
            );
          })}
          {projects.length === 0 && <Empty text="Approved opportunities or scenarios can become decarbonization projects." />}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-brand-offwhite border border-brand-border rounded-lg p-3 min-w-0">
      <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-mono font-bold truncate">{label}</span>
      <strong className="block text-brand-charcoal font-mono text-lg truncate">{value}</strong>
    </div>
  );
}

function FindingCard({ finding, onConvert }: { finding: DiagnosticFinding; onConvert: () => void }) {
  return (
    <div className="border border-brand-border rounded-xl p-4 bg-brand-offwhite text-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {finding.findingType === 'data-gap' ? <AlertTriangle className="w-4 h-4 text-brand-amber" /> : <CheckCircle2 className="w-4 h-4 text-brand-forest" />}
            <h3 className="font-bold text-brand-charcoal">{finding.title}</h3>
          </div>
          <p className="mt-2 text-gray-600 leading-relaxed">{finding.description}</p>
          <div className="mt-2 font-mono text-[10px] text-gray-400 uppercase">{finding.findingType} • {finding.severity} • {finding.category}</div>
        </div>
        <button onClick={onConvert} className="shrink-0 bg-white border border-brand-border rounded px-3 py-2 font-mono font-bold text-brand-forest hover:bg-brand-sage/20">
          Opportunity
        </button>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white border border-dashed border-brand-border rounded-xl p-8 text-center text-xs text-gray-400 font-mono col-span-full">
      <Factory className="w-7 h-7 mx-auto mb-2 text-brand-forest opacity-50" />
      {text}
    </div>
  );
}
