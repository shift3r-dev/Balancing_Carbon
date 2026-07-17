import React, { FormEvent, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  Globe2,
  Info,
  Leaf,
  Mail,
  Network,
  Phone,
  Send,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ViewState } from "../types.ts";

interface PublicPageProps {
  onNavigate: (view: ViewState) => void;
}

interface ServicesPublicPageProps extends PublicPageProps {
  calculator: React.ReactNode;
}

const transition = { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const };

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={reduceMotion ? { duration: 0 } : transition}
    >
      {children}
    </motion.div>
  );
}

function PageBanner({ title, onNavigate }: { title: string; onNavigate: (view: ViewState) => void }) {
  return (
    <section className="v1-page-banner">
      <div className="v1-page-banner-shape" aria-hidden="true" />
      <div className="bc-shell v1-page-banner-inner">
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={transition}>{title}</motion.h1>
        <nav aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate("home")}>Home</button>
          <span>/</span>
          <strong>{title}</strong>
        </nav>
      </div>
    </section>
  );
}

function SectionHeading({ label, title, copy, centered = false }: { label: string; title: React.ReactNode; copy?: string; centered?: boolean }) {
  return (
    <div className={`v1-section-heading${centered ? " v1-section-heading-center" : ""}`}>
      <span className="v1-section-label">{label}</span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

const capabilityCards = [
  ["01", "Carbon Intelligence", "Corporate and product footprints, reduction planning, analytics and reporting."],
  ["02", "Supplier Intelligence", "Supplier readiness, value-chain visibility, OEM responses and collaboration."],
  ["03", "ESG & Sustainability", "ESG readiness, environmental ledgers, evidence and performance reporting."],
];

export function AboutPublicPage({ onNavigate }: PublicPageProps) {
  const principles = [
    [ShieldCheck, "Evidence-Led", "Decisions should be supported by organised and understandable information."],
    [Target, "Business-Relevant", "Sustainability priorities should reflect operational, customer and value-chain requirements."],
    [CircleGauge, "Progress-Focused", "Reporting should help organisations identify priorities and support measurable improvement."],
    [Users, "Collaborative", "Meaningful sustainability progress requires engagement across teams, suppliers and stakeholders."],
  ] as const;

  return (
    <div className="v1-public-page">
      <PageBanner title="About Us" onNavigate={onNavigate} />
      <section className="v1-content-section">
        <Reveal className="bc-shell v1-about-intro">
          <div>
            <SectionHeading label="About Balancing Carbon" title={<>Turning Sustainability Information Into <em>Business Action.</em></>} />
            <p className="v1-leading-copy">Balancing Carbon helps organisations turn complex carbon, supplier and ESG information into coordinated business action.</p>
            <p>Operational records, supplier responses, ESG evidence, projects and reports often live in separate spreadsheets and folders. We bring them into one governed platform so teams can measure, understand, improve and communicate performance.</p>
            <p>The platform connects carbon accounting, supplier intelligence, sustainability planning, collaboration, analytics and reporting.</p>
            <button type="button" className="v1-primary-button" onClick={() => onNavigate("contact")}>Start a Conversation <ArrowRight /></button>
          </div>
          <div className="v1-about-visual" aria-label="Connected sustainability intelligence">
            <Globe2 />
            <div><strong>Carbon Intelligence</strong><span>Measure and understand</span></div>
            <div><strong>ESG Readiness</strong><span>Prepare and communicate</span></div>
          </div>
        </Reveal>
      </section>

      <section className="v1-content-section v1-soft-section">
        <Reveal className="bc-shell">
          <SectionHeading label="Our Purpose" title="Clarity Across the Sustainability Journey" copy="Our approach connects measurement, understanding and action across carbon emissions, supply chains and ESG performance." centered />
          <div className="v1-three-grid">
            {[
              ["01", "Our Mission", "To help organisations make carbon and sustainability information clearer, more structured and more useful for decision-making."],
              ["02", "Our Focus", "To support practical progress across carbon accounting, supplier sustainability, ESG readiness and performance reporting."],
              ["03", "Our Approach", "To understand each organisation’s requirements before developing a clear and relevant path forward."],
            ].map(([number, title, copy]) => <article key={title} className="v1-number-card"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </Reveal>
      </section>

      <section className="v1-content-section">
        <Reveal className="bc-shell">
          <div className="v1-heading-action">
            <SectionHeading label="Our Principles" title="How We Approach Our Work" copy="Effective sustainability programmes require credible information, clear communication and actions relevant to the organisation." />
            <button type="button" className="v1-text-button" onClick={() => onNavigate("services")}>Explore our services <ArrowRight /></button>
          </div>
          <div className="v1-four-grid">
            {principles.map(([Icon, title, copy]) => <article key={title} className="v1-principle-card"><Icon /><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </Reveal>
      </section>

      <section className="v1-content-section v1-dark-section">
        <Reveal className="bc-shell">
          <SectionHeading label="Our Capabilities" title="Connected Sustainability Intelligence" copy="Three connected capability areas spanning operational emissions, value chains, ESG performance and action." centered />
          <div className="v1-capability-links">
            {capabilityCards.map(([number, title, copy]) => (
              <button type="button" key={title} onClick={() => onNavigate("services")}><span>{number}</span><h3>{title}</h3><p>{copy}</p><strong>Discover service <ArrowRight /></strong></button>
            ))}
          </div>
        </Reveal>
      </section>

      <CallToAction label="Work With Us" title="Ready to Strengthen Your Sustainability Journey?" copy="Tell us about your carbon, supplier or ESG requirements and start a conversation with Balancing Carbon." onClick={() => onNavigate("contact")} buttonLabel="Contact Us" />
    </div>
  );
}

const serviceAreas = [
  {
    number: "01",
    kicker: "Measure • Analyse • Reduce",
    title: "Carbon Intelligence",
    copy: "Build traceable carbon inventories, identify hotspots and manage reduction pathways.",
    icon: BarChart3,
    items: [
      ["GHG Accounting", "Calculate Scope 1, Scope 2 and value-chain emissions with governed factors."],
      ["Analytics & Hotspots", "Compare facilities, sources, periods and intensity through drillable analytics."],
      ["Scenarios & Projects", "Model reduction opportunities and convert selected actions into managed projects."],
    ],
  },
  {
    number: "02",
    kicker: "Assess • Collaborate • Respond",
    title: "Supplier Intelligence",
    copy: "Coordinate supplier sustainability information and strengthen value-chain visibility.",
    icon: Network,
    items: [
      ["Supplier Assessments", "Collect and review supplier sustainability information through governed workflows."],
      ["OEM Readiness", "Organise customer questionnaires, evidence, approvals and response status."],
      ["Collaboration", "Assign work, discuss records and coordinate tasks across internal and external teams."],
    ],
  },
  {
    number: "03",
    kicker: "Govern • Improve • Report",
    title: "ESG & Sustainability",
    copy: "Connect environmental performance, ESG readiness, evidence and stakeholder reporting.",
    icon: Leaf,
    items: [
      ["ESG Readiness", "Assess questions, assign owners and manage review and approval status."],
      ["Environmental Ledgers", "Track energy, water, waste, material and air information with source evidence."],
      ["Reporting & Portals", "Create reports and publish approved sustainability information for stakeholders."],
    ],
  },
];

export function ServicesPublicPage({ onNavigate, calculator }: ServicesPublicPageProps) {
  return (
    <div className="v1-public-page">
      <section className="v1-services-hero">
        <div className="bc-shell">
          <nav aria-label="Breadcrumb"><button onClick={() => onNavigate("home")}>Home</button><span>/</span><strong>Services</strong></nav>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={transition}>
            <span className="v1-section-label">Balancing Carbon Services</span>
            <h1>Connected Intelligence for <em>Sustainability Performance.</em></h1>
            <p>Measure carbon, understand suppliers, coordinate ESG information, manage reduction action and produce evidence-backed reports.</p>
            <button type="button" className="v1-primary-button" onClick={() => document.getElementById("all-services")?.scrollIntoView({ behavior: "smooth" })}>Explore Our Services <ArrowRight /></button>
          </motion.div>
          <div className="v1-service-index"><span>01 <strong>Carbon</strong></span><span>02 <strong>Suppliers</strong></span><span>03 <strong>ESG</strong></span></div>
        </div>
      </section>

      <section className="v1-content-section" id="all-services">
        <Reveal className="bc-shell">
          <SectionHeading label="Our Capabilities" title="Three Capabilities. One Connected Platform." />
          <div className="v1-two-column-copy"><p>Bring carbon, supplier and ESG work into one tenant-isolated enterprise workspace.</p><p>Use shared evidence, metadata, analytics, collaboration, AI assistance and reporting across every capability area.</p></div>
        </Reveal>
      </section>

      <section className="v1-service-details">
        {serviceAreas.map((service, index) => {
          const Icon = service.icon;
          return (
            <Reveal key={service.title} className={`v1-service-detail${index % 2 ? " v1-service-detail-alt" : ""}`}>
              <div className="bc-shell v1-service-detail-grid">
                <div className="v1-service-summary"><span>{service.number}</span><Icon /><small>{service.kicker}</small><h2>{service.title}</h2><p>{service.copy}</p><button type="button" className="v1-text-button" onClick={() => onNavigate("contact")}>Explore {service.title} <ArrowRight /></button></div>
                <div className="v1-service-coverage"><span>Service coverage</span>{service.items.map(([title, copy]) => <article key={title}><CheckCircle2 /><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
              </div>
            </Reveal>
          );
        })}
      </section>

      <section className="v1-content-section v1-calculator-section" id="service-calculator">
        <div className="bc-shell">
          <SectionHeading
            label="Interactive Carbon Calculator"
            title={<>Model Your Operational <em>Carbon Footprint.</em></>}
            copy="Select your sector, enter operational values and review live carbon calculations, intensity, diagnostics and reduction trajectories."
            centered
          />
          <div className="v1-calculator-embed">{calculator}</div>
        </div>
      </section>

      <section className="v1-content-section v1-soft-section">
        <Reveal className="bc-shell">
          <SectionHeading label="Connected Approach" title="How the Platform Fits Together" copy="Shared data and evidence strengthen every intelligence and reporting workflow." centered />
          <div className="v1-three-grid">
            {[
              ["01", "Collect & Govern", "Create operational, supplier, ESG and evidence records."],
              ["02", "Analyse & Plan", "Use calculations, analytics, diagnostics, scenarios and projects."],
              ["03", "Collaborate & Report", "Coordinate approvals and publish evidence-backed outputs."],
            ].map(([number, title, copy]) => <article className="v1-number-card" key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </Reveal>
      </section>

      <CallToAction label="Find the Right Service" title="Not Sure Where to Begin?" copy="Tell us about your requirements and we can discuss which service area may be most relevant." onClick={() => onNavigate("contact")} buttonLabel="Contact Us" />
    </div>
  );
}

const faqGroups = [
  {
    id: "general-questions", number: "01", label: "Getting started", title: "General Questions", items: [
      ["What services does Balancing Carbon provide?", "Balancing Carbon provides Carbon Intelligence, Supplier Intelligence and ESG & Sustainability services. These include carbon accounting, footprint reporting, net-zero roadmaps, supplier assessments, ESG readiness and sustainability reporting."],
      ["Which organisations can use these services?", "The services are intended for organisations seeking to understand emissions, respond to customer or supplier requests, improve sustainability reporting or build structured carbon and ESG programmes."],
      ["How does an engagement begin?", "An engagement begins by understanding your organisation, current information, stakeholder requirements and desired outcomes. The appropriate scope can then be defined."],
    ],
  },
  {
    id: "carbon-intelligence", number: "02", label: "Emissions measurement", title: "Carbon Intelligence", items: [
      ["What is carbon accounting?", "Carbon accounting is the process of measuring and categorising an organisation's greenhouse-gas emissions across its operations and value chain."],
      ["What are Scope 1 emissions?", "Scope 1 includes direct emissions from sources owned or controlled by the organisation, such as fuel used in facilities, company vehicles and certain manufacturing processes."],
      ["What are Scope 2 emissions?", "Scope 2 includes indirect emissions associated with purchased electricity, heating, cooling or steam consumed by the organisation."],
      ["What are Scope 3 emissions?", "Scope 3 includes other indirect emissions across the upstream and downstream value chain. Examples include purchased goods, transportation, business travel, employee commuting and product use."],
      ["What is a carbon footprint report?", "A carbon footprint report summarises greenhouse-gas emissions for a defined organisation, activity, product or reporting period. The exact boundary and methodology should be established before measurement."],
      ["What is a net-zero roadmap?", "A net-zero roadmap identifies the organisation's emissions baseline, relevant reduction priorities, proposed actions and a structure for monitoring progress over time."],
    ],
  },
  {
    id: "supplier-intelligence", number: "03", label: "Value-chain visibility", title: "Supplier Intelligence", items: [
      ["What is supplier sustainability assessment?", "A supplier sustainability assessment reviews relevant environmental, social and governance information to understand supplier readiness, risks and improvement opportunities."],
      ["What is OEM supplier readiness?", "OEM supplier readiness focuses on helping suppliers understand and prepare for sustainability information or reporting requests from original equipment manufacturers and other customers."],
      ["Why is supplier information important?", "Supplier information can improve visibility across the value chain and support Scope 3 measurement, customer reporting, risk assessment and sustainability improvement planning."],
      ["Can suppliers be supported with customer reporting?", "Supplier Intelligence includes customer reporting support to help organisations understand, organise and respond to relevant sustainability information requests."],
    ],
  },
  {
    id: "esg-sustainability", number: "04", label: "Readiness and reporting", title: "ESG & Sustainability", items: [
      ["What does ESG stand for?", "ESG stands for Environmental, Social and Governance. These areas help organisations understand and communicate sustainability-related practices, risks and performance."],
      ["What is ESG readiness?", "ESG readiness evaluates whether an organisation has the information, responsibilities, processes and reporting structure needed to address relevant ESG requirements."],
      ["What is sustainability reporting?", "Sustainability reporting communicates relevant environmental, social and governance information to stakeholders. Its content depends on the organisation's reporting objectives and applicable requirements."],
      ["What is an ESG performance dashboard?", "An ESG performance dashboard organises selected sustainability information into a clear visual format to help monitor indicators, identify gaps and communicate progress."],
    ],
  },
];

export function FaqPublicPage({ onNavigate }: PublicPageProps) {
  return (
    <div className="v1-public-page">
      <PageBanner title="FAQ" onNavigate={onNavigate} />
      <section className="v1-content-section v1-faq-intro"><Reveal className="bc-shell"><SectionHeading label="Knowledge Centre" title="Understanding Carbon and Sustainability" copy="Explore carbon intelligence, supplier sustainability and ESG topics. Contact us if your question is not covered." centered /></Reveal></section>
      <section className="v1-faq-content">
        <div className="bc-shell v1-faq-layout">
          <aside className="v1-faq-sidebar"><span>Browse by topic</span><nav aria-label="FAQ categories">{faqGroups.map((group) => <a key={group.id} href={`#${group.id}`}><span>{group.number}</span>{group.title}</a>)}</nav><div><h3>Still have a question?</h3><p>Send us your requirements and our team will get in touch.</p><button onClick={() => onNavigate("contact")}>Contact Us <ArrowRight /></button></div></aside>
          <div className="v1-faq-groups">
            {faqGroups.map((group) => <Reveal key={group.id} className="v1-faq-group"><section id={group.id}><span className="v1-faq-number">{group.number}</span><small>{group.label}</small><h2>{group.title}</h2><div>{group.items.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section></Reveal>)}
          </div>
        </div>
      </section>
      <CallToAction label="Need More Information?" title="Let's Discuss Your Requirements." copy="Contact Balancing Carbon to discuss your carbon, supplier or ESG sustainability questions." onClick={() => onNavigate("contact")} buttonLabel="Contact Us" />
    </div>
  );
}

export function ContactPublicPage({ onNavigate }: PublicPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setSubmitted(false);
    setSubmitError("");
    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          mobile: data.get("mobile"),
          message: data.get("message"),
          consent: data.get("consent") === "on",
          website: data.get("website"),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We could not send your enquiry. Please try again.");
      form.reset();
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="v1-public-page">
      <PageBanner title="Contact Us" onNavigate={onNavigate} />
      <section className="v1-content-section">
        <div className="bc-shell v1-contact-layout">
          <Reveal className="v1-contact-copy">
            <SectionHeading label="Contact Us" title="Start the Conversation" copy="Whether you are beginning your sustainability journey or strengthening an existing programme, share your requirements and we will get in touch." />
            <div className="v1-contact-services">
              {[
                [BarChart3, "Carbon Intelligence", "Scope accounting, carbon reporting and net-zero roadmaps."],
                [Network, "Supplier Intelligence", "Supplier readiness, sustainability assessments and customer reporting support."],
                [Leaf, "ESG & Sustainability", "ESG readiness, sustainability reporting and performance dashboards."],
              ].map(([Icon, title, copy]) => { const ServiceIcon = Icon as typeof BarChart3; return <article key={String(title)}><ServiceIcon /><div><h3>{String(title)}</h3><p>{String(copy)}</p></div></article>; })}
            </div>
            <div className="v1-privacy-note"><Info /><p>Information submitted through this form will only be used to respond to your enquiry.</p></div>
          </Reveal>

          <Reveal className="v1-contact-form-wrap">
            <span className="v1-section-label">Send an enquiry</span>
            <h2>How Can We Help?</h2>
            <p>Complete the form and our team will contact you.</p>
            {submitted && <div className="v1-form-success" role="status"><CheckCircle2 /> Thank you. Your enquiry has been recorded.</div>}
            {submitError && <div className="v1-form-error" role="alert">{submitError}</div>}
            <form onSubmit={submit} className="v1-contact-form">
              <label>Name *<input name="name" required minLength={2} maxLength={120} placeholder="Enter your full name" autoComplete="name" disabled={submitting} /></label>
              <label>Email ID *<input name="email" type="email" required maxLength={254} placeholder="Enter your email address" autoComplete="email" disabled={submitting} /></label>
              <label>Mobile Number *<input name="mobile" type="tel" required minLength={7} maxLength={24} pattern="[+0-9][0-9 ()-]{6,23}" placeholder="Enter your mobile number" autoComplete="tel" disabled={submitting} /></label>
              <label>Message *<textarea name="message" required minLength={10} maxLength={3000} rows={5} placeholder="Tell us about your requirements" disabled={submitting} /><small>Please do not include confidential information.</small></label>
              <input type="text" name="website" hidden tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <label className="v1-consent"><input name="consent" type="checkbox" required disabled={submitting} /> <span>I agree to the Privacy Policy and consent to being contacted regarding this enquiry.</span></label>
              <button type="submit" className="v1-primary-button" disabled={submitting}>{submitting ? "Sending..." : "Send Message"} <Send /></button>
            </form>
          </Reveal>
        </div>
      </section>
      <section className="v1-contact-strip"><div className="bc-shell"><div><Mail /><span><small>Email</small><strong>info@balancingcarbon.com</strong></span></div><div><Phone /><span><small>Location</small><strong>New Delhi, India</strong></span></div></div></section>
    </div>
  );
}

function CallToAction({ label, title, copy, buttonLabel, onClick }: { label: string; title: string; copy: string; buttonLabel: string; onClick: () => void }) {
  return (
    <section className="v1-page-cta"><Reveal className="bc-shell"><span className="v1-section-label">{label}</span><h2>{title}</h2><p>{copy}</p><button type="button" className="v1-light-button" onClick={onClick}>{buttonLabel} <ArrowRight /></button></Reveal></section>
  );
}
