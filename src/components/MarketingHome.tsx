import React from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  Check,
  Factory,
  FileCheck2,
  Gauge,
  Globe2,
  Leaf,
  Network,
  ShieldCheck,
  Target,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ViewState } from "../types.ts";

interface MarketingHomeProps {
  onNavigate: (view: ViewState) => void;
  onLogin: () => void;
  onRegister: () => void;
}

const services = [
  {
    number: "01",
    icon: BarChart3,
    title: "Carbon Intelligence",
    description:
      "Measure, manage and reduce organisational, facility and product carbon footprints through traceable accounting.",
    points: ["Scope 1, 2 and 3 Accounting", "Product Carbon Footprints", "Net-Zero Pathways"],
    view: "services" as ViewState,
  },
  {
    number: "02",
    icon: Network,
    title: "Supplier Intelligence",
    description:
      "Understand supplier sustainability readiness, value-chain exposure and customer reporting requirements.",
    points: ["Supplier Assessments", "OEM Readiness", "Value-Chain Visibility"],
    view: "services" as ViewState,
  },
  {
    number: "03",
    icon: Leaf,
    title: "ESG & Sustainability",
    description:
      "Organise ESG information, improve readiness and communicate sustainability performance with confidence.",
    points: ["ESG Readiness", "Sustainability Reporting", "Performance Dashboards"],
    view: "services" as ViewState,
  },
];

const progressItems = [
  { label: "Scope 1", value: 24 },
  { label: "Scope 2", value: 31 },
  { label: "Scope 3", value: 45 },
];

const industries = [
  [Factory, "Manufacturing"],
  [Building2, "Automotive & OEM"],
  [Globe2, "Export manufacturers"],
  [Zap, "Metals & engineering"],
  [Users, "Multi-facility teams"],
] as const;

const steps = [
  ["01", "Discover", "Understand your organisation, value chain, reporting needs and sustainability priorities."],
  ["02", "Measure", "Collect governed operational, supplier and ESG information across the platform."],
  ["03", "Improve", "Use diagnostics, scenarios and projects to turn insights into measurable action."],
  ["04", "Report", "Generate evidence-backed carbon, supplier and sustainability outputs."],
];

const scopes = [
  {
    label: "Scope 1",
    title: "Direct emissions",
    copy: "Emissions from sources owned or controlled by your organisation.",
    examples: ["Facility fuel", "Company vehicles", "Industrial processes"],
  },
  {
    label: "Scope 2",
    title: "Purchased energy",
    copy: "Indirect emissions from the energy your organisation purchases and consumes.",
    examples: ["Grid electricity", "Purchased steam", "Heating and cooling"],
  },
  {
    label: "Scope 3",
    title: "Value-chain emissions",
    copy: "Other indirect emissions across suppliers, logistics, business travel, products and customers.",
    examples: ["Purchased goods", "Transport and logistics", "Product use"],
  },
];

const questions = [
  [
    "What is carbon accounting?",
    "Carbon accounting is the structured measurement and reporting of greenhouse-gas emissions produced directly and indirectly by an organisation.",
  ],
  [
    "What are Scope 1, Scope 2 and Scope 3 emissions?",
    "Scope 1 covers direct emissions, Scope 2 covers purchased energy and Scope 3 covers other indirect value-chain emissions.",
  ],
  [
    "How does supplier intelligence connect to carbon accounting?",
    "Supplier information supports value-chain visibility, Scope 3 assessment, OEM responses and sustainability risk management.",
  ],
  [
    "What does Carbon AI do?",
    "It explains recorded results, highlights gaps, reviews projects and helps draft narratives while remaining read-only and subject to human review.",
  ],
];

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

export default function MarketingHome({ onNavigate, onLogin, onRegister }: MarketingHomeProps) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.68, ease: [0.22, 1, 0.36, 1] as const };

  const revealProps = {
    initial: reduceMotion ? "visible" : "hidden",
    whileInView: "visible",
    viewport: { once: true, amount: 0.18 },
    variants: reveal,
    transition,
  };

  return (
    <div className="bc-marketing-home">
      <section className="bc-hero" aria-labelledby="home-hero-title">
        <motion.img
          src="/home-hero.webp"
          alt="Renewable energy, sustainable industry, and connected environmental intelligence"
          className="bc-hero-image"
          initial={reduceMotion ? false : { scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 2.2, ease: "easeOut" }}
        />
        <div className="bc-hero-shade" />
        <div className="bc-shell bc-hero-content">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.75, delay: 0.12 }}
            className="bc-hero-copy"
          >
            <span className="bc-eyebrow">
              <Leaf aria-hidden="true" /> Carbon intelligence for business
            </span>
            <h1 id="home-hero-title">
              Turning carbon data into <em>climate action.</em>
            </h1>
            <p>
              Measure emissions, strengthen supplier sustainability and accelerate ESG performance with reliable intelligence built for a low-carbon future.
            </p>
            <div className="bc-actions">
              <button type="button" className="bc-button bc-button-primary" onClick={() => onNavigate("contact")}>
                Start Your Journey <ArrowRight aria-hidden="true" />
              </button>
              <button type="button" className="bc-button bc-button-ghost" onClick={() => onNavigate("services")}>
                Explore Our Services
              </button>
              <button type="button" className="bc-button bc-button-ghost" onClick={() => onNavigate("public-calculator")}>
                <Calculator aria-hidden="true" /> Carbon Calculator
              </button>
            </div>
            <div className="bc-hero-proof" aria-label="Platform capabilities">
              <span><Check aria-hidden="true" /> Carbon Accounting</span>
              <span><Check aria-hidden="true" /> Supplier Intelligence</span>
              <span><Check aria-hidden="true" /> ESG Reporting</span>
            </div>
          </motion.div>
        </div>
        <motion.div
          className="bc-hero-insights"
          initial={reduceMotion ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.5 }}
          aria-hidden="true"
        >
          <div><TrendingDown /><span><strong>Net Zero</strong><small>Clear roadmaps</small></span></div>
          <div><BarChart3 /><span><strong>ESG Insights</strong><small>Actionable data</small></span></div>
        </motion.div>
      </section>

      <section className="bc-section bc-services" id="services-overview">
        <motion.div className="bc-shell" {...revealProps}>
          <div className="bc-section-heading bc-heading-wide">
            <div>
              <span className="bc-eyebrow">Our services</span>
              <h2>Connected intelligence across sustainability</h2>
            </div>
            <p>Bring operational carbon, supplier readiness, ESG information, evidence and action planning into one governed workspace.</p>
          </div>
          <div className="bc-service-grid">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <motion.article
                  key={service.title}
                  className="bc-service-card"
                  initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: reduceMotion ? 0 : 0.55, delay: index * 0.1 }}
                  whileHover={reduceMotion ? undefined : { y: -7 }}
                >
                  <div className="bc-card-top"><span>{service.number}</span><Icon aria-hidden="true" /></div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <ul>{service.points.map((point) => <li key={point}><Check aria-hidden="true" />{point}</li>)}</ul>
                  <button type="button" onClick={() => onNavigate(service.view)}>
                    Discover service <ArrowRight aria-hidden="true" />
                  </button>
                </motion.article>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section className="bc-section bc-proof">
        <div className="bc-shell bc-proof-grid">
          <motion.div className="bc-proof-copy" {...revealProps}>
            <span className="bc-eyebrow bc-eyebrow-light">Why Balancing Carbon</span>
            <h2>Sustainability intelligence your team can <em>trace and act on.</em></h2>
            <p>Connect facility data, suppliers, ESG questions, projects, reports and evidence without losing calculation lineage.</p>
            <div className="bc-proof-list">
              <div><ShieldCheck /><span><strong>Reliable data</strong>Traceable calculations and governed evidence.</span></div>
              <div><FileCheck2 /><span><strong>Reporting confidence</strong>Clear outputs aligned with stakeholder expectations.</span></div>
              <div><Target /><span><strong>Enterprise action</strong>Diagnostics, scenarios and projects connected to the inventory.</span></div>
            </div>
            <button type="button" className="bc-text-link" onClick={() => onNavigate("about")}>Learn about us <ArrowRight /></button>
          </motion.div>

          <motion.div className="bc-intelligence-panel" {...revealProps} transition={{ ...transition, delay: 0.12 }}>
            <div className="bc-panel-head">
              <div><span>Illustrative dashboard</span><strong>Enterprise sustainability overview</strong></div>
              <span className="bc-live"><i /> Connected</span>
            </div>
            <div className="bc-score-row">
              <div className="bc-ring"><span>72<small>%</small></span></div>
              <div><span>Reduction target</span><strong>Net-zero pathway</strong><p>Illustrative programme progress</p></div>
            </div>
            <div className="bc-progress-list">
              {progressItems.map((item, index) => (
                <div key={item.label}>
                  <div><span>{item.label}</span><strong>{item.value}%</strong></div>
                  <div className="bc-progress-track"><motion.span initial={{ width: 0 }} whileInView={{ width: `${item.value}%` }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0 : 1, delay: 0.25 + index * 0.12 }} /></div>
                </div>
              ))}
            </div>
            <div className="bc-panel-foot"><TrendingDown /><span><strong>18.4%</strong> illustrative reduction opportunity</span><Gauge /></div>
          </motion.div>
        </div>
      </section>

      <section className="bc-industries">
        <motion.div className="bc-shell" {...revealProps}>
          <div className="bc-section-heading bc-heading-wide">
            <div><span className="bc-eyebrow">Industry focus</span><h2>Built for complex manufacturing value chains</h2></div>
            <div><p>Support facility teams, sustainability leaders, suppliers, exporters and enterprise reporting stakeholders from one platform.</p><button type="button" className="bc-text-link" onClick={() => onNavigate("contact")}>Discuss Your Requirements <ArrowRight /></button></div>
          </div>
          <div className="bc-industry-row">
            {industries.map(([Icon, label], index) => (
              <motion.button key={label} type="button" onClick={() => onNavigate("industries")} whileHover={reduceMotion ? undefined : { y: -4 }} transition={{ duration: 0.2 }}>
                <span>{String(index + 1).padStart(2, "0")}</span><Icon /><strong>{label}</strong><ArrowRight />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="bc-section bc-process">
        <motion.div className="bc-shell" {...revealProps}>
          <div className="bc-section-heading">
            <span className="bc-eyebrow">How we work</span>
            <h2>A clear path from data to action</h2>
            <p>Our structured approach connects measurement, supplier visibility, planning, collaboration and reporting.</p>
          </div>
          <div className="bc-steps">
            {steps.map(([number, title, copy], index) => (
              <motion.article key={title} initial={reduceMotion ? false : { opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0 : 0.5, delay: index * 0.09 }}>
                <span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="bc-section bc-scopes">
        <motion.div className="bc-shell" {...revealProps}>
          <div className="bc-section-heading bc-heading-wide">
            <div><span className="bc-eyebrow">Carbon accounting</span><h2>Understand your complete emissions boundary</h2></div>
            <p>Measure operational emissions and expand into the value chain with governed data, factors and evidence.</p>
          </div>
          <div className="bc-scope-grid">
            {scopes.map((scope, index) => (
              <motion.article key={scope.label} whileHover={reduceMotion ? undefined : { scale: 1.015 }} transition={{ duration: 0.2 }} className={index === 1 ? "bc-scope-card bc-scope-featured" : "bc-scope-card"}>
                <span>{scope.label}</span><h3>{scope.title}</h3><p>{scope.copy}</p>
                <small>Common examples</small>
                <ul>{scope.examples.map((example) => <li key={example}><Check />{example}</li>)}</ul>
              </motion.article>
            ))}
          </div>
          <button type="button" className="bc-button bc-button-dark bc-centered-action" onClick={() => onNavigate("services")}>Explore Carbon Intelligence <ArrowRight /></button>
        </motion.div>
      </section>

      <section className="bc-section bc-faq">
        <motion.div className="bc-shell bc-faq-grid" {...revealProps}>
          <div className="bc-section-heading">
            <span className="bc-eyebrow">Frequently asked questions</span>
            <h2>Understanding the connected platform</h2>
            <p>Clear answers across carbon accounting, suppliers, ESG, reporting and Carbon AI.</p>
          </div>
          <div className="bc-questions">
            {questions.map(([question, answer]) => (
              <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="bc-cta">
        <motion.div className="bc-shell bc-cta-inner" {...revealProps}>
          <div><span className="bc-eyebrow bc-eyebrow-light">Start today</span><h2>Connect your sustainability programme.</h2></div>
          <p>Move from fragmented spreadsheets to coordinated carbon, supplier and ESG intelligence.</p>
          <div className="bc-actions">
            <button type="button" className="bc-button bc-button-primary" onClick={() => onNavigate("contact")}>Speak to Our Team <ArrowRight /></button>
            <button type="button" className="bc-button bc-button-ghost" onClick={() => onNavigate("services")}>Explore Services</button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
