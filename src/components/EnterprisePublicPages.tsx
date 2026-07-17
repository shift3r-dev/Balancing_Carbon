import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  Database,
  FileCheck2,
  FileText,
  Filter,
  Gauge,
  Globe2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import type { ViewState } from "../types";
import {
  aiContent,
  caseStudyContent,
  contentByKind,
  findPublicContent,
  industryContent,
  insightContent,
  serviceContent,
  toolContent,
  type PublicContentItem,
  type PublicContentKind,
} from "../content/publicContent";

export type PublicDetailView =
  | "service-detail"
  | "industry-detail"
  | "ai-detail"
  | "tool-detail"
  | "insight-detail"
  | "case-study-detail";

type PublicNavigate = (view: ViewState, slug?: string) => void;

const kindToView: Record<PublicContentKind, PublicDetailView> = {
  service: "service-detail",
  industry: "industry-detail",
  ai: "ai-detail",
  tool: "tool-detail",
  insight: "insight-detail",
  "case-study": "case-study-detail",
};

const kindLabels: Record<PublicContentKind, string> = {
  service: "Service",
  industry: "Industry",
  ai: "AI capability",
  tool: "Tool",
  insight: "Insight",
  "case-study": "Case study",
};

function HubHero({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: React.ReactNode }) {
  return (
    <section className="ep-hero">
      <div className="bc-shell ep-hero-inner">
        <div>
          <span className="ep-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{copy}</p>
        </div>
        {actions && <div className="ep-hero-actions">{actions}</div>}
      </div>
    </section>
  );
}

function ConversionBand({ onNavigate, compact = false }: { onNavigate: PublicNavigate; compact?: boolean }) {
  return (
    <section className={`ep-conversion ${compact ? "ep-conversion-compact" : ""}`}>
      <div className="bc-shell ep-conversion-inner">
        <div>
          <span className="ep-eyebrow">Build a decision-ready baseline</span>
          <h2>Start with your data, not a generic dashboard.</h2>
          <p>We will map one representative facility, identify data gaps and define the shortest path to a reviewable carbon inventory.</p>
        </div>
        <div className="ep-conversion-actions">
          <button className="ep-button ep-button-light" onClick={() => onNavigate("contact")}>Book a consultation <ArrowRight /></button>
          <button className="ep-button ep-button-ghost" onClick={() => onNavigate("public-calculator")}>Try the calculator <Calculator /></button>
        </div>
      </div>
    </section>
  );
}

function ContentCard({ item, kind, onNavigate }: { item: PublicContentItem; kind: PublicContentKind; onNavigate: PublicNavigate }) {
  const Icon = kind === "ai" ? Sparkles : kind === "industry" ? Building2 : kind === "tool" ? Calculator : kind === "insight" ? BookOpen : kind === "case-study" ? FileCheck2 : Workflow;
  return (
    <article className="ep-card">
      <div className="ep-card-topline"><span><Icon /> {item.eyebrow}</span>{item.status && <small>Illustrative</small>}</div>
      <h2>{item.title}</h2>
      <p>{item.summary}</p>
      <ul>{item.highlights.slice(0, 3).map((point) => <li key={point}><Check />{point.replace(/^Input: |^Output: /, "")}</li>)}</ul>
      <button onClick={() => onNavigate(kindToView[kind], item.slug)}>Explore {kindLabels[kind].toLowerCase()} <ArrowRight /></button>
    </article>
  );
}

export function ContentHubPage({ kind, onNavigate }: { kind: PublicContentKind; onNavigate: PublicNavigate }) {
  const [query, setQuery] = useState("");
  const configuration = {
    service: { eyebrow: "Carbon intelligence services", title: "From measurement to managed climate action.", copy: "Focused services that connect carbon accounting, product footprints, supplier data, reporting and transition planning in one governed operating model." },
    industry: { eyebrow: "Industry solutions", title: "Configured around how your operations actually work.", copy: "Source maps, units, factors, evidence rules and reporting priorities adapted to industrial processes rather than generic ESG checklists." },
    ai: { eyebrow: "Governed carbon AI", title: "AI that explains. Deterministic engines that calculate.", copy: "Use AI to retrieve, structure and draft from authorised data while keeping calculations, approvals and ledger changes under explicit human control." },
    tool: { eyebrow: "Interactive tools", title: "Move from a question to a reviewable first result.", copy: "Guided calculators and readiness tools expose their assumptions, data quality and next steps so teams can progress without presenting estimates as verified claims." },
    insight: { eyebrow: "Climate intelligence library", title: "Practical guidance for carbon and ESG teams.", copy: "Clear implementation guides for sustainability, operations, finance, procurement and assurance leaders building reliable reporting programmes." },
    "case-study": { eyebrow: "Workflow examples", title: "See how connected carbon operations take shape.", copy: "Professional illustrative examples show the intended implementation pattern. They are clearly marked and will be replaced by verified customer stories after approval." },
  }[kind];
  const filtered = useMemo(() => contentByKind[kind].filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase())), [kind, query]);

  return (
    <div className="ep-page">
      <HubHero
        {...configuration}
        actions={kind === "tool" ? <button className="ep-button ep-button-light" onClick={() => onNavigate("public-calculator")}>Open calculator <ArrowRight /></button> : undefined}
      />
      <section className="ep-index-section">
        <div className="bc-shell">
          <div className="ep-index-toolbar">
            <div><Filter /><span>{filtered.length} {kind === "case-study" ? "examples" : `${kindLabels[kind].toLowerCase()}s`}</span></div>
            <label className="ep-search"><Search /><span className="sr-only">Search this collection</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${kind === "case-study" ? "examples" : `${kindLabels[kind].toLowerCase()}s`}...`} /></label>
          </div>
          <div className="ep-card-grid">
            {filtered.map((item) => <ContentCard key={item.slug} item={item} kind={kind} onNavigate={onNavigate} />)}
          </div>
          {filtered.length === 0 && <div className="ep-empty">No matching content. Try a broader search.</div>}
        </div>
      </section>
      {kind === "ai" && <AIGovernanceBand />}
      {kind === "industry" && <FrameworkBand />}
      <ConversionBand onNavigate={onNavigate} />
    </div>
  );
}

function FrameworkBand() {
  return (
    <section className="ep-framework-band">
      <div className="bc-shell">
        <span className="ep-eyebrow">Reference architecture</span>
        <h2>Built to support recognised reporting and calculation practices.</h2>
        <p>Framework references describe supported workflow alignment, not certification or assurance.</p>
        <div className="ep-framework-list">{["GHG Protocol", "ISO 14064-1", "ISO 14067", "SEBI BRSR", "GRI", "ISSB", "CDP", "IPCC", "India CEA"].map((item) => <span key={item}>{item}</span>)}</div>
      </div>
    </section>
  );
}

function AIGovernanceBand() {
  return (
    <section className="ep-governance-band">
      <div className="bc-shell ep-governance-grid">
        <div><span className="ep-eyebrow">AI control model</span><h2>Useful by design. Limited by design.</h2></div>
        <div className="ep-governance-points">
          <p><LockKeyhole /> Authorised tenant context only</p>
          <p><Database /> No autonomous ledger writes</p>
          <p><FileCheck2 /> Citations and confidence signals</p>
          <p><ShieldCheck /> Human review before external use</p>
        </div>
      </div>
    </section>
  );
}

export function PublicDetailPage({ kind, slug, onNavigate }: { kind: PublicContentKind; slug: string; onNavigate: PublicNavigate }) {
  const item = findPublicContent(kind, slug) ?? contentByKind[kind][0];
  const backView: ViewState = kind === "service" ? "services" : kind === "industry" ? "industries" : kind === "ai" ? "ai" : kind === "tool" ? "tools" : kind === "insight" ? "insights" : "case-studies";

  return (
    <article className="ep-page ep-detail-page">
      <section className="ep-detail-hero">
        <div className="bc-shell">
          <button className="ep-back" onClick={() => onNavigate(backView)}><ChevronRight /> Back to {backView.replace("-", " ")}</button>
          <span className="ep-eyebrow">{item.eyebrow}</span>
          <h1>{item.title}</h1>
          <p>{item.summary}</p>
          <div className="ep-detail-actions">
            <button className="ep-button ep-button-primary" onClick={() => onNavigate("contact")}>Discuss this with us <ArrowRight /></button>
            {kind === "tool" && <button className="ep-button ep-button-outline" onClick={() => onNavigate("public-calculator")}>Open calculator <Calculator /></button>}
          </div>
        </div>
      </section>

      <section className="ep-detail-overview">
        <div className="bc-shell ep-detail-layout">
          <div className="ep-reading-column">
            {item.status && <div className="ep-placeholder-notice"><FileText /><div><strong>Publication note</strong><p>{item.status}</p></div></div>}
            <div className="ep-prose"><span className="ep-section-label">Overview</span><h2>A controlled path from data to decision.</h2><p>{item.description}</p></div>
            {item.challenges && <div className="ep-prose"><span className="ep-section-label">Problems addressed</span><h2>Where teams lose time and confidence.</h2><div className="ep-challenge-grid">{item.challenges.map((point) => <p key={point}><Target />{point}</p>)}</div></div>}
            {item.methodology && <div className="ep-prose"><span className="ep-section-label">Methodology</span><h2>A transparent implementation sequence.</h2><ol className="ep-method-list">{item.methodology.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol></div>}
            {item.deliverables && <div className="ep-prose"><span className="ep-section-label">Deliverables</span><h2>What your team receives.</h2><div className="ep-deliverables">{item.deliverables.map((deliverable) => <p key={deliverable}><Check />{deliverable}</p>)}</div></div>}
            <div className="ep-prose"><span className="ep-section-label">Common questions</span><h2>Clarity before implementation.</h2><details><summary>Can this replace professional assurance or regulatory advice?</summary><p>No. The platform supports calculation, evidence, workflow and reporting preparation. Formal assurance and legal interpretation remain with qualified independent professionals.</p></details><details><summary>How is data quality handled?</summary><p>Records retain source, unit, factor, period and calculation metadata. Exceptions and low-confidence AI outputs are surfaced for review rather than silently accepted.</p></details><details><summary>Can we start with one facility or product?</summary><p>Yes. A representative pilot is often the fastest way to confirm source mappings, responsibilities and reporting boundaries before wider rollout.</p></details></div>
          </div>
          <aside className="ep-detail-aside">
            <div><span>Key outcomes</span>{item.highlights.map((point) => <p key={point}><Check />{point}</p>)}</div>
            {item.frameworks && <div><span>References</span>{item.frameworks.map((framework) => <p key={framework}><ShieldCheck />{framework}</p>)}</div>}
            {item.timeline && <div><span>Expected timeline</span><p><Gauge />{item.timeline}</p></div>}
          </aside>
        </div>
      </section>
      <RelatedContent item={item} kind={kind} onNavigate={onNavigate} />
      <ConversionBand onNavigate={onNavigate} compact />
    </article>
  );
}

function RelatedContent({ item, kind, onNavigate }: { item: PublicContentItem; kind: PublicContentKind; onNavigate: PublicNavigate }) {
  const fallback = kind === "service" ? toolContent : kind === "industry" ? serviceContent : kind === "ai" ? toolContent : insightContent;
  const related = (item.related ?? []).map((slug) => [...serviceContent, ...toolContent, ...aiContent, ...insightContent].find((entry) => entry.slug === slug)).filter(Boolean) as PublicContentItem[];
  const visible = (related.length ? related : fallback.filter((entry) => entry.slug !== item.slug)).slice(0, 3);
  return (
    <section className="ep-related"><div className="bc-shell"><span className="ep-section-label">Continue exploring</span><h2>Related capabilities and guidance.</h2><div className="ep-related-grid">{visible.map((entry) => {
      const targetKind: PublicContentKind = serviceContent.includes(entry) ? "service" : toolContent.includes(entry) ? "tool" : aiContent.includes(entry) ? "ai" : "insight";
      return <button key={entry.slug} onClick={() => onNavigate(kindToView[targetKind], entry.slug)}><span>{entry.eyebrow}</span><strong>{entry.title}</strong><ArrowRight /></button>;
    })}</div></div></section>
  );
}

export function ResourcesHubPage({ onNavigate }: { onNavigate: PublicNavigate }) {
  const resourceGroups = [
    { title: "Insights and guides", copy: "Implementation guidance for carbon, ESG, supplier and transition teams.", view: "insights" as ViewState, count: insightContent.length, icon: BookOpen },
    { title: "Whitepapers", copy: "Long-form implementation papers prepared for sustainability and enterprise data leaders.", view: "whitepapers" as ViewState, count: 3, icon: FileText },
    { title: "Research", copy: "Applied research priorities and future publications with explicit methods and limitations.", view: "research" as ViewState, count: 3, icon: Gauge },
    { title: "Case studies", copy: "Illustrative workflows today, with verified customer stories added after approval.", view: "case-studies" as ViewState, count: caseStudyContent.length, icon: FileCheck2 },
    { title: "Framework library", copy: "A navigational reference for the standards and disclosures supported by the platform.", view: "frameworks" as ViewState, count: 9, icon: Globe2 },
    { title: "Journal", copy: "Product, policy and practice notes from the Balancing Carbon team.", view: "blog" as ViewState, count: 3, icon: BookOpen },
    { title: "Media and press", copy: "Approved boilerplate, brand assets and company announcements.", view: "press" as ViewState, count: 2, icon: FileText },
  ];
  return <div className="ep-page"><HubHero eyebrow="Resources" title="Practical knowledge for climate operators." copy="Guides, examples, framework references and approved company materials designed to help teams move from reporting questions to controlled action." /><section className="ep-index-section"><div className="bc-shell ep-resource-grid">{resourceGroups.map(({ title, copy, view, count, icon: Icon }) => <button key={title} onClick={() => onNavigate(view)}><Icon /><span>{count} resources</span><h2>{title}</h2><p>{copy}</p><strong>Open collection <ArrowRight /></strong></button>)}</div></section><ConversionBand onNavigate={onNavigate} /></div>;
}

const frameworkDetails = [
  ["GHG Protocol", "Corporate, Scope 2, Scope 3 and Product calculation principles"],
  ["ISO 14064-1", "Organisation-level inventory design and reporting alignment"],
  ["ISO 14067", "Product carbon footprint methodology alignment"],
  ["SEBI BRSR", "India sustainability disclosure preparation and evidence workflow"],
  ["GRI", "Topic-based sustainability reporting references"],
  ["ISSB IFRS S1/S2", "Investor-focused sustainability and climate disclosure references"],
  ["CDP", "Climate and supply-chain questionnaire data preparation"],
  ["IPCC", "Emission-factor and methodology references"],
  ["India CEA", "Electricity emission-factor support for India-based inventories"],
];

export function FrameworksPage({ onNavigate }: { onNavigate: PublicNavigate }) {
  return <div className="ep-page"><HubHero eyebrow="Framework library" title="Standards mapped into usable workflows." copy="Balancing Carbon helps organise data and evidence around recognised frameworks. References below describe workflow support and do not imply certification, endorsement or assurance." /><section className="ep-index-section"><div className="bc-shell ep-framework-cards">{frameworkDetails.map(([title, copy]) => <article key={title}><ShieldCheck /><h2>{title}</h2><p>{copy}</p><span>Supported reference</span></article>)}</div></section><ConversionBand onNavigate={onNavigate} /></div>;
}

export function TrustPage({ onNavigate }: { onNavigate: PublicNavigate }) {
  const controls = [
    [LockKeyhole, "Tenant isolation", "Authorisation and organisation context are applied before application data is retrieved."],
    [Database, "Governed ledgers", "Imported records pass through validation and staging before they affect operational calculations."],
    [FileCheck2, "Calculation lineage", "Source, unit, factor, period and calculation metadata remain attached to records."],
    [Sparkles, "Human-reviewed AI", "Generated responses are advisory, cited where available and cannot autonomously update ledgers."],
    [Workflow, "Role-aware workflows", "Administrative and reporting actions are separated by workspace roles and review states."],
    [ShieldCheck, "Security roadmap", "Formal certifications and independent penetration-test claims will be published only after verification."],
  ];
  return <div className="ep-page"><HubHero eyebrow="Trust centre" title="Controls you can inspect, not promises you have to infer." copy="A transparent view of the platform's current security, governance, data and AI control model. Formal certification claims remain unpublished until independently verified." /><section className="ep-index-section"><div className="bc-shell ep-trust-grid">{controls.map(([Icon, title, copy]) => { const TrustIcon = Icon as typeof ShieldCheck; return <article key={String(title)}><TrustIcon /><h2>{String(title)}</h2><p>{String(copy)}</p></article>; })}</div></section><AIGovernanceBand /><ConversionBand onNavigate={onNavigate} /></div>;
}

type CompanyPageKind = "careers" | "partners" | "press" | "media-kit";
const companyCopy: Record<CompanyPageKind, { eyebrow: string; title: string; copy: string; sections: [string, string][] }> = {
  careers: { eyebrow: "Careers", title: "Build the operating system for credible climate action.", copy: "We are interested in people who combine product judgement, engineering discipline and sustainability fluency.", sections: [["Open roles", "No public vacancies are currently listed. Send a concise expression of interest to info@balancingcarbon.com."], ["How we work", "Small teams, direct ownership, careful claims and a bias toward useful software over sustainability theatre."], ["Equal opportunity", "Hiring policy and employment terms will be published after legal review."]] },
  partners: { eyebrow: "Partner network", title: "Connect software with trusted implementation expertise.", copy: "We work with sustainability advisers, auditors, engineering specialists and technology integrators where client outcomes need complementary expertise.", sections: [["Advisory partners", "Support inventory design, disclosure, assurance readiness and transition planning."], ["Technology partners", "Connect operational systems, data pipelines and enterprise identity infrastructure."], ["Specialist partners", "Provide engineering validation, life-cycle expertise and independent assurance."]] },
  press: { eyebrow: "Press room", title: "Approved information about Balancing Carbon.", copy: "Company descriptions and announcements intended for journalists, event organisers and ecosystem partners.", sections: [["Company boilerplate", "Balancing Carbon is a carbon intelligence platform helping organisations connect emissions, supplier, ESG and reduction data through governed workflows."], ["Announcements", "No public press releases are currently published."], ["Media contact", "Use info@balancingcarbon.com with the subject line Media enquiry."]] },
  "media-kit": { eyebrow: "Media kit", title: "Brand assets with clear usage guidance.", copy: "Approved logo files and company descriptions for editorial and partner use.", sections: [["Logo pack", "The current site favicon and logo pack are approved for Balancing Carbon-owned channels. External usage requires written permission."], ["Brand description", "Use the approved company boilerplate from the press room."], ["Photography", "No external image library is currently licensed for third-party distribution."]] },
};

export function CompanyInfoPage({ page, onNavigate }: { page: CompanyPageKind; onNavigate: PublicNavigate }) {
  const content = companyCopy[page];
  return <div className="ep-page"><HubHero eyebrow={content.eyebrow} title={content.title} copy={content.copy} /><section className="ep-company-sections"><div className="bc-shell">{content.sections.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{title}</h2><p>{copy}</p></div></article>)}</div></section><ConversionBand onNavigate={onNavigate} compact /></div>;
}

type StrategicPageKind = "mission" | "vision" | "methodology" | "certifications" | "research" | "whitepapers" | "blog";
const strategicCopy: Record<StrategicPageKind, { eyebrow: string; title: string; copy: string; sections: [string, string][]; note?: string }> = {
  mission: { eyebrow: "Our mission", title: "Make climate data operational, traceable and useful.", copy: "Balancing Carbon exists to help organisations move from fragmented reporting activity to disciplined climate operations.", sections: [["Reliable measurement", "Give teams a defensible view of emissions, resources, suppliers and evidence."], ["Shared accountability", "Connect sustainability decisions to facility owners, finance, procurement and management review."], ["Practical action", "Turn hotspots and scenarios into governed projects with clear assumptions and ownership."]] },
  vision: { eyebrow: "Our vision", title: "Every climate claim connected to evidence and action.", copy: "We see a future where sustainability information is managed with the same discipline as financial and operational data.", sections: [["Connected intelligence", "Carbon, supplier, ESG and project information should operate as one decision system."], ["Trust by design", "Users should be able to inspect sources, factors, assumptions and approvals behind every result."], ["Scaled participation", "Practical workflows should make credible climate action accessible to industrial organisations and their value chains."]] },
  methodology: { eyebrow: "Platform methodology", title: "A controlled chain from source record to external report.", copy: "The methodology separates data ingestion, validation, deterministic calculation, review, reporting and AI assistance into clear control stages.", sections: [["1. Define", "Confirm organisational boundary, reporting period, facilities, products and applicable frameworks."], ["2. Collect", "Ingest source records, evidence and supplier responses through mapped templates or configured integrations."], ["3. Validate", "Check references, units, dates, duplicates and data confidence before records reach operational ledgers."], ["4. Calculate", "Use versioned factors and explicit formula metadata for deterministic emissions results."], ["5. Review", "Assign owners, resolve exceptions, approve evidence and lock controlled reporting periods."], ["6. Report and act", "Generate review-ready outputs, model scenarios and govern reduction projects."]] },
  certifications: { eyebrow: "Standards and certifications", title: "Clear about what is supported and what is verified.", copy: "Balancing Carbon references recognised calculation, reporting and security practices. It does not claim certification, accreditation or endorsement unless independently verified and published here.", sections: [["Methodology references", "GHG Protocol, ISO 14064-1, ISO 14067, IPCC and India CEA references are supported in relevant workflows."], ["Disclosure references", "BRSR, GRI, ISSB and CDP can be mapped for reporting preparation."], ["Security certifications", "No SOC 2 or ISO 27001 certification is currently claimed on this site."], ["Assurance", "Platform outputs are not independent assurance. Customers appoint qualified assurance providers where required."]], note: "Publication status: current and intentionally conservative." },
  research: { eyebrow: "Research", title: "Applied research for credible industrial decarbonisation.", copy: "Research notes will examine data quality, factor governance, supplier participation and the practical economics of transition levers.", sections: [["Research agenda", "Industrial data quality, MSME supplier reporting, product footprints and operational decarbonisation."], ["Evidence policy", "Methods, assumptions and limitations will accompany every published finding."], ["Collaboration", "Academic and industry research partnerships are welcomed through the partner programme."]], note: "No original research paper is currently published. This page is ready for approved releases." },
  whitepapers: { eyebrow: "Whitepapers", title: "Deep implementation guidance for climate operators.", copy: "Long-form papers will connect reporting requirements to the data, controls and operating practices needed to deliver them.", sections: [["Planned paper", "Building an assurance-ready carbon data architecture for multi-site manufacturers."], ["Planned paper", "Supplier carbon data programmes for Indian exporters and OEM value chains."], ["Planned paper", "Governing AI inside carbon accounting and ESG reporting workflows."]], note: "Editorial placeholders - publication dates require owner approval." },
  blog: { eyebrow: "Balancing Carbon journal", title: "Product, policy and practice notes.", copy: "Short updates from the team on platform capabilities, reporting changes and implementation lessons.", sections: [["Product notes", "Release explanations focused on user outcomes, controls and migration considerations."], ["Policy notes", "Plain-language summaries with links to primary regulatory or standards sources."], ["Practice notes", "Implementation patterns from carbon, supplier and ESG operations."]], note: "No journal posts are currently approved for publication. Use the Insights library for available guides." },
};

export function StrategicInfoPage({ page, onNavigate }: { page: StrategicPageKind; onNavigate: PublicNavigate }) {
  const content = strategicCopy[page];
  return <div className="ep-page"><HubHero eyebrow={content.eyebrow} title={content.title} copy={content.copy} /><section className="ep-company-sections"><div className="bc-shell">{content.note && <div className="ep-placeholder-notice"><FileText /><div><strong>Publication note</strong><p>{content.note}</p></div></div>}{content.sections.map(([title, copy], index) => <article key={`${title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{title}</h2><p>{copy}</p></div></article>)}</div></section><ConversionBand onNavigate={onNavigate} compact /></div>;
}

type LegalPageKind = "privacy" | "terms" | "cookies";
const legalCopy: Record<LegalPageKind, { title: string; effective: string; sections: [string, string][] }> = {
  privacy: { title: "Privacy notice", effective: "Draft for legal review - 16 July 2026", sections: [["Information we process", "Account, organisation, facility, operational, evidence and support information provided by authorised users."], ["Purpose", "To deliver, secure and improve the Balancing Carbon service, respond to enquiries and meet contractual obligations."], ["Data sharing", "We do not sell personal data. Service providers may process limited data under contract for hosting, authentication, support or configured AI services."], ["Retention and rights", "Retention periods and data-subject request procedures must be confirmed in the final jurisdiction-specific legal notice."], ["Contact", "Privacy enquiries can be sent to info@balancingcarbon.com."]] },
  terms: { title: "Website and platform terms", effective: "Draft for legal review - 16 July 2026", sections: [["Service scope", "Balancing Carbon provides software for data management, calculation, workflow, analysis and reporting preparation."], ["Professional judgement", "The service is not legal, assurance, engineering or investment advice. Users remain responsible for review and external submissions."], ["Account security", "Customers are responsible for authorised users, credential security and lawful data submission."], ["Acceptable use", "The platform must not be used to misrepresent verified status, evade controls, upload unlawful content or access another tenant's data."], ["Commercial terms", "Subscription, service levels, liability and governing-law terms will be set in the applicable customer agreement."]] },
  cookies: { title: "Cookie notice", effective: "Draft for legal review - 16 July 2026", sections: [["Essential storage", "The application uses essential browser storage to maintain authenticated sessions and interface preferences."], ["Analytics", "No non-essential marketing or analytics cookies should be enabled until consent controls and a verified vendor list are published."], ["Managing storage", "Users can clear browser storage through their browser settings; doing so may sign them out."], ["Updates", "This notice will be updated before any additional cookie or tracking category is introduced."]] },
};

export function LegalPage({ page }: { page: LegalPageKind }) {
  const content = legalCopy[page];
  return <div className="ep-page"><HubHero eyebrow="Legal" title={content.title} copy={content.effective} /><section className="ep-legal"><div className="bc-shell"><div className="ep-placeholder-notice"><FileText /><div><strong>Legal review required</strong><p>This draft provides transparent interim information and must be reviewed by qualified counsel before commercial launch.</p></div></div>{content.sections.map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}</div></section></div>;
}
