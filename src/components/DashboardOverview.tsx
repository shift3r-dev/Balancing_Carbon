import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  FileCheck,
  FolderClosed,
  Gauge,
  Plus,
  Target,
  Upload,
  Zap,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DecarbonizationProject,
  Document,
  EnergyRecord,
  ESGQuestion,
  Facility,
  OEMQuestionnaire,
  Organisation,
  ProductionRecord,
  ReductionOpportunity,
  Report,
  ViewState,
} from '../types.ts';

interface OverviewProps {
  organisation?: Organisation | null;
  facilities: Facility[];
  records: EnergyRecord[];
  productionRecords?: ProductionRecord[];
  esgQuestions: ESGQuestion[];
  oemSurveys: OEMQuestionnaire[];
  documents: Document[];
  reports?: Report[];
  opportunities?: ReductionOpportunity[];
  projects?: DecarbonizationProject[];
  onNavigate: (view: ViewState) => void;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const emission = (record: EnergyRecord) => Number(record.emissionsTCO2e ?? record.emissions ?? 0);
const compactFacilityName = (name: string) =>
  name.replace(' Manufacturing Plant', '').replace(' Component Facility', '').replace(' Assembly Unit', '');
const tonneUnit = (unit: string) => {
  const normalized = unit.toLowerCase();
  return normalized.includes('tonne') || normalized === 't' || normalized === 'ton';
};

export default function DashboardOverview({
  organisation,
  facilities,
  records,
  productionRecords = [],
  esgQuestions,
  oemSurveys,
  documents,
  reports = [],
  opportunities = [],
  projects = [],
  onNavigate,
}: OverviewProps) {
  const model = useMemo(() => {
    const hasActivityRecords = records.length > 0;
    const scope1 = hasActivityRecords
      ? records.filter((record) => record.scope === 'scope-1').reduce((sum, record) => sum + emission(record), 0)
      : facilities.reduce((sum, facility) => sum + facility.emissionsScope1, 0);
    const scope2 = hasActivityRecords
      ? records.filter((record) => record.scope === 'scope-2').reduce((sum, record) => sum + emission(record), 0)
      : facilities.reduce((sum, facility) => sum + facility.emissionsScope2, 0);
    const total = scope1 + scope2;

    const monthly = records.reduce<Record<string, { name: string; actual: number; scope1: number; scope2: number }>>((acc, record) => {
      const key = record.date?.slice(0, 7) || record.reportingPeriod || 'Unassigned';
      if (!acc[key]) acc[key] = { name: key, actual: 0, scope1: 0, scope2: 0 };
      const value = emission(record);
      acc[key].actual += value;
      if (record.scope === 'scope-1') acc[key].scope1 += value;
      if (record.scope === 'scope-2') acc[key].scope2 += value;
      return acc;
    }, {});
    const trend = Object.values(monthly).sort((a, b) => a.name.localeCompare(b.name));
    const previousMonth = trend.at(-2);
    const currentMonth = trend.at(-1);
    const footprintTrend = previousMonth && previousMonth.actual > 0
      ? ((currentMonth!.actual - previousMonth.actual) / previousMonth.actual) * 100
      : 0;

    const targetReduction = Number(organisation?.targetReductionPercent ?? 0);
    const chartData = trend.map((row, index) => {
      const target = targetReduction > 0 && trend[0]?.actual
        ? trend[0].actual * (1 - (targetReduction / 100) * (index / Math.max(1, trend.length - 1)))
        : undefined;
      const projected = index === trend.length - 1 && trend.length > 1
        ? row.actual + (row.actual - trend[index - 1].actual)
        : undefined;
      return { ...row, target, projected: projected !== undefined ? Math.max(0, projected) : undefined };
    });

    const productionRows = productionRecords.filter((record) => tonneUnit(record.unit));
    const productionTotal = productionRows.length > 0
      ? productionRows.reduce((sum, record) => sum + Number(record.quantity ?? 0), 0)
      : facilities.reduce((sum, facility) => sum + facility.productionOutput, 0);
    const carbonIntensity = productionTotal > 0 ? total / productionTotal : 0;

    const totalElectricity = hasActivityRecords
      ? records.filter((record) => record.scope === 'scope-2').reduce((sum, record) => sum + record.quantity, 0)
      : facilities.reduce((sum, facility) => sum + facility.electricityConsumption, 0);
    const renewable = hasActivityRecords
      ? records.filter((record) => record.activityType === 'renewable-electricity').reduce((sum, record) => sum + record.quantity, 0)
      : facilities.reduce((sum, facility) => sum + facility.renewableEnergyUsage, 0);
    const renewableShare = totalElectricity > 0 ? (renewable / totalElectricity) * 100 : 0;

    const sourceRows = Object.entries(records.reduce<Record<string, number>>((acc, record) => {
      const source = record.sourceType || record.energyType || 'Unknown';
      acc[source] = (acc[source] ?? 0) + emission(record);
      return acc;
    }, {}))
      .map(([name, value]) => ({
        name,
        value,
        share: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
    const largestSource = sourceRows[0];

    const productionByFacility = productionRows.reduce<Record<string, number>>((acc, record) => {
      acc[record.facilityId] = (acc[record.facilityId] ?? 0) + Number(record.quantity ?? 0);
      return acc;
    }, {});
    const facilityRows = facilities.map((facility) => {
      const facilityRecords = records.filter((record) => record.facilityId === facility.id);
      const facilityScope1 = hasActivityRecords
        ? facilityRecords.filter((record) => record.scope === 'scope-1').reduce((sum, record) => sum + emission(record), 0)
        : facility.emissionsScope1;
      const facilityScope2 = hasActivityRecords
        ? facilityRecords.filter((record) => record.scope === 'scope-2').reduce((sum, record) => sum + emission(record), 0)
        : facility.emissionsScope2;
      const facilityTotal = facilityScope1 + facilityScope2;
      const production = productionByFacility[facility.id] ?? facility.productionOutput;
      const intensity = production > 0 ? (facilityTotal * 1000) / production : 0;
      return {
        id: facility.id,
        name: compactFacilityName(facility.name),
        total: facilityTotal,
        intensity,
        production,
        risk: intensity > 300 ? 'High' : intensity > 160 ? 'Medium' : 'Low',
      };
    }).sort((a, b) => b.total - a.total);
    const largestFacility = facilityRows[0];
    const highestIntensity = [...facilityRows].sort((a, b) => b.intensity - a.intensity)[0];

    const activityMonths = new Set(records.map((record) => record.date?.slice(0, 7)).filter(Boolean)).size;
    const productionMonths = new Set(productionRows.map((record) => record.date?.slice(0, 7)).filter(Boolean)).size;
    const activityCoverage = Math.min(100, (activityMonths / 12) * 100);
    const productionCoverage = Math.min(100, (productionMonths / 12) * 100);
    const evidenceCoverage = records.length > 0 ? Math.min(100, (documents.length / records.length) * 100) : documents.length > 0 ? 100 : 0;
    const factorCoverage = records.length > 0
      ? (records.filter((record) => Boolean(record.emissionFactorId || record.auditTrail?.emissionFactorId)).length / records.length) * 100
      : 0;
    const dataQuality = (activityCoverage * 0.35) + (productionCoverage * 0.25) + (evidenceCoverage * 0.2) + (factorCoverage * 0.2);
    const confidence = dataQuality >= 80 ? 'High' : dataQuality >= 50 ? 'Medium' : 'Needs data';

    const readinessItems = esgQuestions.length > 0
      ? esgQuestions.filter((question) => question.status === 'Compliant' || question.reviewStatus === 'Approved').length
      : 0;
    const complianceReadiness = esgQuestions.length > 0 ? (readinessItems / esgQuestions.length) * 100 : 0;
    const pendingApprovals = oemSurveys.reduce((sum, survey) => sum + survey.questions.filter((question) => question.status !== 'Approved').length, 0);
    const reportsReady = reports.filter((report) => report.status === 'Generated').length;
    const activeProjects = projects.filter((project) => ['planned', 'approved', 'in-progress'].includes(project.status));
    const plannedAnnualReduction = projects.reduce((sum, project) => sum + Number(project.targetAnnualReductionTCO2e ?? 0), 0);

    const hotspots = [
      largestFacility ? {
        title: 'Highest Emitting Facility',
        metric: `${largestFacility.total.toFixed(1)} tCO2e`,
        action: 'Review source mix and production denominator.',
        severity: largestFacility.total > total * 0.5 ? 'high' : 'medium',
      } : null,
      highestIntensity && highestIntensity.intensity > 0 ? {
        title: 'Highest Carbon Intensity',
        metric: `${highestIntensity.intensity.toFixed(1)} kg/t`,
        action: 'Investigate load profile and output allocation.',
        severity: highestIntensity.intensity > 300 ? 'high' : 'medium',
      } : null,
      largestSource ? {
        title: 'Largest Emission Source',
        metric: `${largestSource.share.toFixed(1)}%`,
        action: 'Prioritize factor and evidence review.',
        severity: largestSource.share > 60 ? 'high' : 'medium',
      } : null,
      productionCoverage < 50 ? {
        title: 'Missing Production Data',
        metric: `${productionCoverage.toFixed(0)}% coverage`,
        action: 'Upload monthly production output.',
        severity: 'high',
      } : null,
      evidenceCoverage < 50 ? {
        title: 'Missing Evidence',
        metric: `${evidenceCoverage.toFixed(0)}% linked`,
        action: 'Attach invoices and source documents.',
        severity: 'medium',
      } : null,
    ].filter(Boolean) as Array<{ title: string; metric: string; action: string; severity: string }>;

    const insights = [
      previousMonth && currentMonth
        ? `Operational footprint changed ${footprintTrend.toFixed(1)}% versus ${previousMonth.name}.`
        : 'Add at least two months of activity records to explain performance changes.',
      largestSource
        ? `${largestSource.name} is the largest emission source at ${largestSource.share.toFixed(1)}% of the recorded footprint.`
        : 'No source breakdown is available until activity records are added.',
      productionCoverage < 100
        ? `Production data completeness is ${productionCoverage.toFixed(0)}%; missing production is not treated as zero.`
        : 'Production coverage is complete for the detected months.',
    ];

    const recentActivity = [
      ...records.slice(0, 5).map((record) => ({
        date: record.date,
        label: `${record.sourceType || record.energyType} activity logged`,
        detail: `${record.quantity.toLocaleString()} ${record.unit} at ${record.emissionsTCO2e.toFixed(3)} tCO2e`,
      })),
      ...documents.slice(0, 3).map((doc) => ({ date: doc.uploadDate, label: 'Evidence uploaded', detail: doc.name })),
      ...reports.slice(0, 3).map((report) => ({ date: report.createdDate, label: 'Report generated', detail: report.title })),
      ...projects.slice(0, 3).map((project) => ({ date: project.updatedAt || project.createdAt, label: 'Project updated', detail: project.title })),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);

    return {
      scope1,
      scope2,
      total,
      chartData,
      carbonIntensity,
      renewableShare,
      sourceRows,
      facilityRows,
      largestFacility,
      largestSource,
      dataQuality,
      confidence,
      complianceReadiness,
      pendingApprovals,
      reportsReady,
      activeProjects,
      plannedAnnualReduction,
      hotspots,
      insights,
      recentActivity,
      footprintTrend,
      activityCoverage,
      productionCoverage,
      evidenceCoverage,
      factorCoverage,
      productionTotal,
    };
  }, [documents, esgQuestions, facilities, oemSurveys, opportunities, organisation, productionRecords, projects, records, reports]);

  const headerCompany = organisation?.name || 'Apex Precision Components Pvt. Ltd.';
  const reportingPeriod = organisation?.reportingYear || records[0]?.reportingPeriod || facilities[0]?.reportingPeriod || 'FY 2025-26';
  const lastUpdated = records[0]?.date || reports[0]?.createdDate || 'No activity yet';

  return (
    <div className="space-y-6">
      <section className="bg-white border border-brand-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Welcome back</span>
            <h1 className="text-2xl font-black tracking-tight text-brand-charcoal">{headerCompany}</h1>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-gray-500">
              <span>Period: {reportingPeriod}</span>
              <span>Last updated: {lastUpdated}</span>
              <span>Boundary: Operational Scope 1 + Scope 2</span>
              <span>Facilities: {facilities.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <QuickAction icon={Plus} label="Add Activity" onClick={() => onNavigate('dashboard-energy')} />
            <QuickAction icon={FileCheck} label="Generate Report" onClick={() => onNavigate('dashboard-reports')} />
            <QuickAction icon={Upload} label="Upload Evidence" onClick={() => onNavigate('dashboard-documents')} />
            <QuickAction icon={BarChart3} label="Run Scenario" onClick={() => onNavigate('dashboard-intelligence')} />
            <QuickAction icon={Target} label="Create Project" onClick={() => onNavigate('dashboard-intelligence')} />
          </div>
        </div>
      </section>

      <section className="bg-brand-charcoal text-white rounded-xl p-6 border border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-sage">Enterprise carbon command center</span>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{model.total.toLocaleString('en-US', { maximumFractionDigits: 1 })} tCO2e</h2>
            <p className="mt-2 text-xs text-gray-300">Operational footprint from stored activity records and facility aggregates.</p>
          </div>
          <DarkMetric label="Carbon Intensity" value={`${(model.carbonIntensity * 1000).toFixed(1)} kg/t`} />
          <DarkMetric label="Largest Facility" value={model.largestFacility?.name || 'No data'} />
          <DarkMetric label="Largest Source" value={model.largestSource?.name || 'No data'} />
          <DarkMetric label="Data Quality" value={`${model.dataQuality.toFixed(0)}%`} sub={model.confidence} />
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Operational Footprint" value={model.total.toLocaleString('en-US', { maximumFractionDigits: 1 })} unit="tCO2e" trend={model.footprintTrend} comparison="vs previous month" status={model.confidence} />
        <KpiCard title="Scope 1" value={model.scope1.toLocaleString('en-US', { maximumFractionDigits: 1 })} unit="tCO2e" comparison="direct fuel and process sources" status="Calculated" />
        <KpiCard title="Scope 2" value={model.scope2.toLocaleString('en-US', { maximumFractionDigits: 1 })} unit="tCO2e" comparison="location-based electricity" status="Calculated" />
        <KpiCard title="Carbon Intensity" value={(model.carbonIntensity * 1000).toFixed(1)} unit="kg/t" comparison={`${model.productionTotal.toLocaleString()} tonnes output`} status={model.productionCoverage > 50 ? 'Production linked' : 'Needs production'} />
        <KpiCard title="Renewable Share" value={model.renewableShare.toFixed(1)} unit="%" comparison="of scope 2 energy records" status={model.renewableShare > 0 ? 'Tracked' : 'No renewable records'} />
        <KpiCard title="Compliance Readiness" value={model.complianceReadiness.toFixed(0)} unit="%" comparison={`${model.pendingApprovals} pending approvals`} status="Evidence workflow" />
        <KpiCard title="Data Quality" value={model.dataQuality.toFixed(0)} unit="%" comparison={`${model.confidence} confidence`} status="Activity + production + evidence + factors" />
        <KpiCard title="Active Projects" value={model.activeProjects.length} unit="" comparison={`${model.plannedAnnualReduction.toFixed(1)} tCO2e/yr planned`} status="Phase 2" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-brand-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold font-mono uppercase text-brand-charcoal">Monthly Emissions Trend</h3>
              <p className="text-xs text-gray-500">Actual emissions with target line when a reduction target exists.</p>
            </div>
            <span className="text-[10px] font-mono text-gray-400">tCO2e</span>
          </div>
          <MonthlyTrendChart data={model.chartData} showTarget={Number(organisation?.targetReductionPercent ?? 0) > 0} />
        </div>

        <div className="bg-white border border-brand-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold font-mono uppercase text-brand-charcoal">Emission Sources</h3>
          <p className="text-xs text-gray-500 mt-1">Drill-down by source contribution.</p>
          <div className="mt-4 space-y-3">
            {model.sourceRows.slice(0, 8).map((source) => (
              <button key={source.name} onClick={() => onNavigate('dashboard-energy')} className="w-full text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand-charcoal truncate">{source.name}</span>
                  <span className="font-mono text-gray-500">{source.value.toFixed(1)} tCO2e</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-brand-offwhite overflow-hidden">
                  <div className="h-full bg-brand-forest" style={{ width: `${clamp(source.share)}%` }} />
                </div>
                <div className="mt-0.5 text-[10px] font-mono text-gray-400">{source.share.toFixed(1)}%</div>
              </button>
            ))}
            {model.sourceRows.length === 0 && <EmptyState text="No source records available." />}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-brand-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold font-mono uppercase text-brand-charcoal">Facility Performance</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {model.facilityRows.map((facility) => (
              <button key={facility.id} onClick={() => onNavigate('dashboard-facilities')} className="border border-brand-border rounded-lg p-4 text-left hover:bg-brand-sage/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-brand-charcoal">{facility.name}</h4>
                    <p className="text-[10px] font-mono text-gray-400 mt-1">{facility.production.toLocaleString()} tonnes production</p>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${facility.risk === 'High' ? 'bg-red-50 text-brand-red' : facility.risk === 'Medium' ? 'bg-amber-50 text-brand-amber' : 'bg-brand-sage text-brand-forest'}`}>
                    {facility.risk} Risk
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniMetric label="Footprint" value={`${facility.total.toFixed(1)} t`} />
                  <MiniMetric label="Intensity" value={`${facility.intensity.toFixed(1)} kg/t`} />
                </div>
              </button>
            ))}
            {model.facilityRows.length === 0 && <EmptyState text="Add facilities to compare performance." />}
          </div>
        </div>

        <div className="bg-white border border-brand-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold font-mono uppercase text-brand-charcoal">AI Insights From Calculations</h3>
          <p className="text-xs text-gray-500 mt-1">Generated only from existing dashboard values.</p>
          <div className="mt-4 space-y-3">
            {model.insights.map((insight) => (
              <div key={insight} className="border border-brand-border rounded-lg p-3 bg-brand-offwhite text-xs text-brand-charcoal leading-relaxed">
                {insight}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Hotspots" subtitle="Compact investigation queue">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
            {model.hotspots.map((hotspot) => (
              <div key={hotspot.title} className={`rounded-lg border p-3 ${hotspot.severity === 'high' ? 'border-red-100 bg-red-50' : 'border-amber-100 bg-amber-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-brand-charcoal">{hotspot.title}</span>
                  <AlertTriangle className={`w-4 h-4 ${hotspot.severity === 'high' ? 'text-brand-red' : 'text-brand-amber'}`} />
                </div>
                <strong className="block mt-1 font-mono text-lg text-brand-charcoal">{hotspot.metric}</strong>
                <p className="mt-1 text-[11px] text-gray-600">{hotspot.action}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Compliance Readiness" subtitle="Progress bars only">
          <Progress label="Activity Records" value={model.activityCoverage} />
          <Progress label="Evidence Coverage" value={model.evidenceCoverage} />
          <Progress label="Production Data" value={model.productionCoverage} />
          <Progress label="Emission Factors" value={model.factorCoverage} />
          <Progress label="Reports Ready" value={reports.length > 0 ? (model.reportsReady / reports.length) * 100 : 0} />
          <Progress label="OEM Questionnaires" value={oemSurveys.length > 0 ? ((oemSurveys.length - oemSurveys.filter((survey) => survey.status !== 'Completed').length) / oemSurveys.length) * 100 : 0} />
        </Panel>

        <Panel title="Recent Activity" subtitle="Newest operational events">
          <div className="space-y-3">
            {model.recentActivity.map((item) => (
              <div key={`${item.date}-${item.label}-${item.detail}`} className="flex gap-3 text-xs">
                <div className="mt-1 w-2 h-2 rounded-full bg-brand-forest shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-brand-charcoal truncate">{item.label}</div>
                  <div className="text-gray-500 truncate">{item.detail}</div>
                  <div className="text-[10px] font-mono text-gray-400">{item.date}</div>
                </div>
              </div>
            ))}
            {model.recentActivity.length === 0 && <EmptyState text="No recent activity yet." />}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-brand-charcoal hover:bg-black text-white rounded-lg px-3 py-2 font-mono font-bold flex items-center justify-center gap-1.5 transition-colors">
      <Icon className="w-3.5 h-3.5 text-brand-sage" /> {label}
    </button>
  );
}

function DarkMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/8 border border-white/10 rounded-lg p-4 min-w-0">
      <span className="block text-[9px] font-mono uppercase tracking-wider text-gray-400">{label}</span>
      <strong className="block mt-1 text-lg font-mono text-brand-sage truncate">{value}</strong>
      {sub && <span className="block mt-1 text-[10px] text-gray-400">{sub}</span>}
    </div>
  );
}

function MonthlyTrendChart({
  data,
  showTarget,
}: {
  data: Array<{ name: string; actual: number; target?: number; projected?: number }>;
  showTarget: boolean;
}) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full rounded-lg bg-brand-offwhite border border-dashed border-brand-border flex items-center justify-center text-xs font-mono text-gray-400">
        Add activity records to build the monthly trend.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-lg bg-brand-offwhite/40 pt-3 pr-3">
      <ComposedChart width={900} height={300} data={data} margin={{ top: 10, right: 24, left: 8, bottom: 18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE5" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'monospace' }}
          tickFormatter={(value) => String(value).slice(2)}
          interval={0}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'monospace' }}
          width={66}
          tickFormatter={(value) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        />
        <Tooltip
          cursor={{ fill: 'rgba(31, 90, 61, 0.08)' }}
          contentStyle={{ fontSize: 11, fontFamily: 'monospace', borderRadius: 8, borderColor: '#DDE8DF' }}
          formatter={(value, name) => [
            `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })} tCO2e`,
            String(name),
          ]}
          labelFormatter={(label) => `Month: ${label}`}
        />
        <Bar dataKey="actual" name="Actual emissions" fill="#1F5A3D" radius={[6, 6, 0, 0]} maxBarSize={46} />
        {showTarget && (
          <Line
            type="monotone"
            dataKey="target"
            name="Target emissions"
            stroke="#C88A32"
            strokeWidth={2}
            strokeDasharray="6 6"
            dot={{ r: 3, fill: '#C88A32', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        )}
        <Line
          type="monotone"
          dataKey="projected"
          name="Projected emissions"
          stroke="#64748B"
          strokeWidth={2}
          strokeDasharray="3 6"
          dot={{ r: 3, fill: '#64748B', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </ComposedChart>
      <div className="flex flex-wrap items-center gap-4 px-4 pb-3 text-[10px] font-mono text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-forest" />Actual</span>
        {showTarget && <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#C88A32]" />Target</span>}
        <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-slate-500" />Projected</span>
      </div>
    </div>
  );
}

function KpiCard({ title, value, unit, trend, comparison, status }: { title: string; value: string | number; unit: string; trend?: number; comparison: string; status: string }) {
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend) && trend !== 0;
  return (
    <div className="bg-white border border-brand-border rounded-xl p-4 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold truncate">{title}</span>
        <CheckCircle2 className="w-4 h-4 text-brand-forest shrink-0" />
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <strong className="text-2xl font-mono text-brand-charcoal truncate">{value}</strong>
        {unit && <span className="text-xs font-mono text-gray-500">{unit}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-mono">
        <span className={hasTrend ? (trend! <= 0 ? 'text-brand-forest' : 'text-brand-red') : 'text-gray-400'}>
          {hasTrend ? `${trend! <= 0 ? 'down' : 'up'} ${Math.abs(trend!).toFixed(1)}%` : 'baseline'}
        </span>
        <span className="text-gray-400 truncate">{comparison}</span>
      </div>
      <div className="mt-2 text-[10px] text-brand-forest font-mono truncate">{status}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-brand-offwhite rounded p-2">
      <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-mono">{label}</span>
      <strong className="block text-sm font-mono text-brand-charcoal">{value}</strong>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-brand-border rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold font-mono uppercase text-brand-charcoal">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-brand-charcoal">{label}</span>
        <span className="font-mono text-gray-500">{clamp(value).toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-brand-offwhite overflow-hidden">
        <div className="h-full bg-brand-forest" style={{ width: `${clamp(value)}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-brand-border rounded-lg p-4 text-center text-xs text-gray-400 font-mono">
      {text}
    </div>
  );
}
