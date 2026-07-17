import { useEffect } from "react";
import type { ViewState } from "../types";
import { findPublicContent, type PublicContentKind } from "../content/publicContent";

const baseUrl = "https://balancingcarbon.com";

const pageMeta: Partial<Record<ViewState, { title: string; description: string; path: string }>> = {
  home: { title: "Balancing Carbon | Enterprise Carbon Intelligence", description: "Measure emissions, strengthen supplier sustainability and accelerate ESG performance with governed carbon intelligence.", path: "/" },
  services: { title: "Carbon and ESG Services | Balancing Carbon", description: "Carbon accounting, product footprints, supplier intelligence, ESG reporting, energy management and net-zero strategy.", path: "/services" },
  industries: { title: "Industry Carbon Solutions | Balancing Carbon", description: "Carbon accounting and sustainability workflows configured for manufacturing, materials, energy, logistics and infrastructure.", path: "/industries" },
  ai: { title: "Governed Carbon AI | Balancing Carbon", description: "Human-reviewed AI for carbon data, reporting, document extraction, forecasting, scenarios and recommendations.", path: "/ai" },
  tools: { title: "Carbon Calculators and ESG Tools | Balancing Carbon", description: "Interactive carbon, ESG, supplier, energy and decarbonisation tools with visible assumptions and review steps.", path: "/tools" },
  resources: { title: "Carbon Intelligence Resources | Balancing Carbon", description: "Practical guides, illustrative case studies, framework references and company resources.", path: "/resources" },
  insights: { title: "Carbon and ESG Insights | Balancing Carbon", description: "Practical carbon accounting, ESG reporting, supplier and net-zero implementation guides.", path: "/insights" },
  "case-studies": { title: "Carbon Platform Case Studies | Balancing Carbon", description: "Illustrative implementation workflows for carbon accounting, product footprints and supplier programmes.", path: "/case-studies" },
  trust: { title: "Trust Centre | Balancing Carbon", description: "Platform controls for tenant isolation, governed ledgers, calculation lineage, role-aware workflows and human-reviewed AI.", path: "/trust" },
  frameworks: { title: "Carbon and ESG Framework Library | Balancing Carbon", description: "Workflow references for GHG Protocol, ISO 14064, ISO 14067, BRSR, GRI, ISSB, CDP, IPCC and India CEA.", path: "/frameworks" },
  about: { title: "About Balancing Carbon", description: "Our mission is to make climate data operational, traceable and useful for organisations that need to act.", path: "/about" },
  contact: { title: "Contact Balancing Carbon", description: "Discuss carbon accounting, ESG reporting, supplier intelligence or a representative facility pilot.", path: "/contact" },
  faq: { title: "Frequently Asked Questions | Balancing Carbon", description: "Answers about the Balancing Carbon platform, calculations, data security, implementation and support.", path: "/faq" },
  pricing: { title: "Pricing | Balancing Carbon", description: "Compare Balancing Carbon plans for organisations building governed carbon and sustainability operations.", path: "/pricing" },
  careers: { title: "Careers | Balancing Carbon", description: "Build useful, governed climate software with Balancing Carbon.", path: "/careers" },
  partners: { title: "Partners | Balancing Carbon", description: "Partner with Balancing Carbon across sustainability advisory, assurance, engineering and enterprise technology.", path: "/partners" },
  press: { title: "Press Room | Balancing Carbon", description: "Approved company information and media contact details for Balancing Carbon.", path: "/press" },
  "media-kit": { title: "Media Kit | Balancing Carbon", description: "Approved Balancing Carbon brand information and usage guidance.", path: "/media-kit" },
  mission: { title: "Mission | Balancing Carbon", description: "Make climate data operational, traceable and useful for organisations that need to act.", path: "/mission" },
  vision: { title: "Vision | Balancing Carbon", description: "A future where every climate claim is connected to evidence, ownership and action.", path: "/vision" },
  methodology: { title: "Platform Methodology | Balancing Carbon", description: "The controlled chain from source data and deterministic calculation to review, reporting and action.", path: "/methodology" },
  certifications: { title: "Standards and Certifications | Balancing Carbon", description: "A transparent record of supported framework references and independently verified certification status.", path: "/certifications" },
  research: { title: "Carbon Intelligence Research | Balancing Carbon", description: "Applied research priorities for industrial carbon data, supplier participation and decarbonisation.", path: "/research" },
  whitepapers: { title: "Carbon and ESG Whitepapers | Balancing Carbon", description: "Long-form implementation guidance for carbon, supplier and ESG operating teams.", path: "/whitepapers" },
  blog: { title: "Balancing Carbon Journal", description: "Product, policy and implementation notes from Balancing Carbon.", path: "/blog" },
  privacy: { title: "Privacy Notice | Balancing Carbon", description: "How Balancing Carbon processes and protects account, organisation and platform data.", path: "/privacy" },
  terms: { title: "Terms | Balancing Carbon", description: "Website and platform terms for Balancing Carbon.", path: "/terms" },
  cookies: { title: "Cookie Notice | Balancing Carbon", description: "Information about essential browser storage and cookie controls at Balancing Carbon.", path: "/cookies" },
};

const detailKinds: Partial<Record<ViewState, { kind: PublicContentKind; path: string }>> = {
  "service-detail": { kind: "service", path: "/services" },
  "industry-detail": { kind: "industry", path: "/industries" },
  "ai-detail": { kind: "ai", path: "/ai" },
  "tool-detail": { kind: "tool", path: "/tools" },
  "insight-detail": { kind: "insight", path: "/insights" },
  "case-study-detail": { kind: "case-study", path: "/case-studies" },
};

function setMeta(name: string, value: string, property = false) {
  const attribute = property ? "property" : "name";
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = value;
}

export default function PublicSeo({ view, slug }: { view: ViewState; slug?: string }) {
  useEffect(() => {
    const detail = detailKinds[view];
    const detailItem = detail && slug ? findPublicContent(detail.kind, slug) : undefined;
    const meta = detailItem
      ? { title: detailItem.seoTitle ?? `${detailItem.title} | Balancing Carbon`, description: detailItem.seoDescription ?? detailItem.summary, path: `${detail!.path}/${detailItem.slug}` }
      : pageMeta[view] ?? pageMeta.home!;
    const canonicalUrl = `${baseUrl}${meta.path}`;

    document.title = meta.title;
    setMeta("description", meta.description);
    setMeta("og:title", meta.title, true);
    setMeta("og:description", meta.description, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", meta.title);
    setMeta("twitter:description", meta.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const scriptId = "balancing-carbon-structured-data";
    document.getElementById(scriptId)?.remove();
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": detailItem ? "WebPage" : view === "home" ? "Organization" : "CollectionPage",
      name: detailItem?.title ?? meta.title,
      description: meta.description,
      url: canonicalUrl,
      ...(view === "home" ? { logo: `${baseUrl}/android-chrome-512x512.png`, email: "info@balancingcarbon.com" } : {}),
    });
    document.head.appendChild(script);
  }, [view, slug]);

  return null;
}
