import React, { Suspense, lazy, useState, useEffect } from "react";
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Building2,
  ExternalLink,
  Factory,
  ChevronRight,
  Flame,
  Zap,
  Award,
  FileText,
  CheckCircle2,
  Menu,
  X,
  Building,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  Save,
  Calculator,
  FileCheck,
  FolderClosed,
  Database,
  Info,
  HelpCircle,
} from "lucide-react";

// Brand & Modular Components
import AsymmetricInfinityLogo from "./components/AsymmetricInfinityLogo.tsx";
import AssessmentForm from "./components/AssessmentForm.tsx";
import DashboardSidebar from "./components/DashboardSidebar.tsx";
import MarketingHome from "./components/MarketingHome.tsx";
import PublicAuthPortal from "./components/PublicAuthPortal.tsx";
import PublicSeo from "./components/PublicSeo.tsx";
import {
  CompanyInfoPage,
  ContentHubPage,
  FrameworksPage,
  LegalPage,
  PublicDetailPage,
  ResourcesHubPage,
  StrategicInfoPage,
  TrustPage,
} from "./components/EnterprisePublicPages.tsx";
import {
  AboutPublicPage,
  ContactPublicPage,
  FaqPublicPage,
} from "./components/PublicMarketingPages.tsx";
import EntitlementGate from "./components/EntitlementGate.tsx";
import LearningCentre, { ContextHelpDrawer, FirstRunWelcome, OnboardingWidget } from "./components/UserEnablement.tsx";
import { getAuthenticatedHeaders, parseJsonResponse, safeFetchJson } from "./services/apiClient.ts";

const PublicCarbonCalculator = lazy(() => import("./components/PublicCarbonCalculator.tsx"));
const DashboardOverview = lazy(() => import("./components/DashboardOverview.tsx"));
const FacilityManagement = lazy(() => import("./components/FacilityManagement.tsx"));
const EnergyTracking = lazy(() => import("./components/EnergyTracking.tsx"));
const CarbonEngineUI = lazy(() => import("./components/CarbonEngineUI.tsx"));
const ESGAssessmentModule = lazy(() => import("./components/ESGAssessmentModule.tsx"));
const OEMQuestionnaireModule = lazy(() => import("./components/OEMQuestionnaireModule.tsx"));
const DocumentCentre = lazy(() => import("./components/DocumentCentre.tsx"));
const AIAssistantModule = lazy(() => import("./components/AIAssistantModule.tsx"));
const SubscriptionSettings = lazy(() => import("./components/SubscriptionSettings.tsx"));
const ReportingWorkspace = lazy(() => import("./components/ReportingWorkspace.tsx"));
const CarbonIntelligenceHub = lazy(() => import("./components/CarbonIntelligenceHub.tsx"));
const PricingPage = lazy(() => import("./components/PricingPage.tsx"));
const MetadataStudio = lazy(() => import("./components/MetadataStudio.tsx"));
const EnterpriseDataHub = lazy(() => import("./components/EnterpriseDataHub.tsx"));
const AnalyticsStudio = lazy(() => import("./components/AnalyticsStudio.tsx"));
const SustainabilityIntelligence = lazy(() => import("./components/SustainabilityIntelligence.tsx"));
const CollaborationCenter = lazy(() => import("./components/CollaborationCenter.tsx"));
const PublicPortalAdmin = lazy(() => import("./components/PublicPortalAdmin.tsx"));
const PublicESGPortal = lazy(() => import("./components/PublicESGPortal.tsx"));
const MarketplaceHub = lazy(() => import("./components/MarketplaceHub.tsx"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard.tsx"));
const PlatformAdminConsole = lazy(() => import("./components/PlatformAdminConsole.tsx"));

// Shared interfaces
import {
  Facility,
  EnergyRecord,
  ProductionRecord,
  DataCompletenessResult,
  DecarbonizationProject,
  DiagnosticFinding,
  DiagnosticQuestionResponse,
  ESGQuestion,
  OEMQuestionnaire,
  Document,
  Organisation,
  ReductionOpportunity,
  ReductionScenario,
  MonthComparison,
  ViewState,
} from "./types.ts";

function DashboardModuleLoader({ label }: { label: string }) {
  return (
    <div className="min-h-80 bg-white border border-brand-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-xs font-mono text-gray-400">
      <RefreshCw className="w-6 h-6 animate-spin text-brand-forest" />
      <span>{label}</span>
    </div>
  );
}

const publicBaseRoutes: Partial<Record<ViewState, string>> = {
  home: "/",
  services: "/services",
  industries: "/industries",
  ai: "/ai",
  tools: "/tools",
  resources: "/resources",
  insights: "/insights",
  "case-studies": "/case-studies",
  trust: "/trust",
  frameworks: "/frameworks",
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  pricing: "/pricing",
  careers: "/careers",
  partners: "/partners",
  press: "/press",
  "media-kit": "/media-kit",
  mission: "/mission",
  vision: "/vision",
  methodology: "/methodology",
  certifications: "/certifications",
  research: "/research",
  whitepapers: "/whitepapers",
  blog: "/blog",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
  login: "/login",
  assessment: "/assessment",
  "public-calculator": "/calculator",
};

const detailRouteMap: Record<string, { view: ViewState; prefix: string }> = {
  services: { view: "service-detail", prefix: "/services" },
  industries: { view: "industry-detail", prefix: "/industries" },
  ai: { view: "ai-detail", prefix: "/ai" },
  tools: { view: "tool-detail", prefix: "/tools" },
  insights: { view: "insight-detail", prefix: "/insights" },
  "case-studies": { view: "case-study-detail", prefix: "/case-studies" },
};

function publicLocationState() {
  const cleanPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const detailMatch = cleanPath.match(/^\/(services|industries|ai|tools|insights|case-studies)\/([^/]+)$/);
  if (detailMatch) return { view: detailRouteMap[detailMatch[1]].view, slug: decodeURIComponent(detailMatch[2]) };
  const entry = Object.entries(publicBaseRoutes).find(([, path]) => path === cleanPath);
  return { view: (entry?.[0] as ViewState | undefined) ?? "home", slug: "" };
}

function publicPathFor(view: ViewState, slug = "") {
  const detail = Object.values(detailRouteMap).find((entry) => entry.view === view);
  if (detail && slug) return `${detail.prefix}/${encodeURIComponent(slug)}`;
  return publicBaseRoutes[view] ?? "/";
}

export default function App() {
  // Navigation & User session states
  const initialPublicLocation = publicLocationState();
  const [currentView, setCurrentView] = useState<ViewState>(() =>
    localStorage.getItem("balancing_carbon_session") ? "dashboard-overview" : initialPublicLocation.view,
  );
  const [publicContentSlug, setPublicContentSlug] = useState(initialPublicLocation.slug);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardNavOpen, setDashboardNavOpen] = useState(false);
  const [contextHelpOpen, setContextHelpOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem("balancing_carbon_session") !== null;
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem("balancing_carbon_session");
    if (!saved) return null;
    try {
      const session = JSON.parse(saved);
      return session.user ?? session; // backward compatibility with legacy stored user-only sessions
    } catch {
      return null;
    }
  });

  // Login & Signup credentials states
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [passwordResetMessage, setPasswordResetMessage] = useState("");

  const navigatePublic = (view: ViewState, slug = "") => {
    setCurrentView(view);
    setPublicContentSlug(slug);
    setMobileMenuOpen(false);
    const nextPath = publicPathFor(view, slug);
    if (window.location.pathname !== nextPath) window.history.pushState({ view, slug }, "", nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handlePopState = () => {
      if (authenticated) return;
      const locationState = publicLocationState();
      setCurrentView(locationState.view);
      setPublicContentSlug(locationState.slug);
      setMobileMenuOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [authenticated]);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupOrgName, setSignupOrgName] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupPlanId, setSignupPlanId] = useState("plan-starter");
  const [signupBillingInterval, setSignupBillingInterval] = useState<"monthly" | "yearly">("monthly");

  // Core business models synced from backend
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [organisationDraft, setOrganisationDraft] = useState<Organisation | null>(null);
  const [organisationSaveState, setOrganisationSaveState] = useState<"" | "saving" | "saved" | "error">("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [records, setRecords] = useState<EnergyRecord[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [esgQuestions, setEsgQuestions] = useState<ESGQuestion[]>([]);
  const [oemSurveys, setOemSurveys] = useState<OEMQuestionnaire[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [diagnosticFindings, setDiagnosticFindings] = useState<DiagnosticFinding[]>([]);
  const [diagnosticCompleteness, setDiagnosticCompleteness] = useState<DataCompletenessResult | null>(null);
  const [diagnosticComparison, setDiagnosticComparison] = useState<MonthComparison | null>(null);
  const [diagnosticResponses, setDiagnosticResponses] = useState<DiagnosticQuestionResponse[]>([]);
  const [opportunities, setOpportunities] = useState<ReductionOpportunity[]>([]);
  const [scenarios, setScenarios] = useState<ReductionScenario[]>([]);
  const [projects, setProjects] = useState<DecarbonizationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState("BRSR Core Audit Report");
  const [reportPeriod, setReportPeriod] = useState("FY 2025-26");
  const [reportSummary, setReportSummary] = useState("");

  useEffect(() => {
    setOrganisationDraft(organisation);
  }, [organisation]);

  // Sync state on mount or user changes
  useEffect(() => {
    async function fetchInitialData() {
      if (!authenticated || !currentUser) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const endpoints = [
          "/api/organisation",
          "/api/facilities",
          "/api/energy",
          "/api/production",
          "/api/esg",
          "/api/oem-surveys",
          "/api/documents",
          "/api/reports",
          "/api/opportunities",
          "/api/scenarios",
          "/api/projects",
          "/api/diagnostic-responses",
        ];

        const headers = getAuthenticatedHeaders();

        const responses = await Promise.all(
          endpoints.map((url) => fetch(url, { headers })),
        );

        const orgData = await parseJsonResponse(responses[0], null);
        const facData = await parseJsonResponse(responses[1], []);
        const energyData = await parseJsonResponse(responses[2], []);
        const productionData = await parseJsonResponse(responses[3], []);
        const esgData = await parseJsonResponse(responses[4], []);
        const oemData = await parseJsonResponse(responses[5], []);
        const docData = await parseJsonResponse(responses[6], []);
        const repData = await parseJsonResponse(responses[7], []);
        const opportunityData = await parseJsonResponse(responses[8], []);
        const scenarioData = await parseJsonResponse(responses[9], []);
        const projectData = await parseJsonResponse(responses[10], []);
        const diagnosticResponseData = await parseJsonResponse(responses[11], []);

        setOrganisation(orgData);
        setFacilities(
          Array.isArray(facData) ? facData : (facData?.facilities ?? []),
        );
        setRecords(
          Array.isArray(energyData) ? energyData : (energyData?.records ?? []),
        );
        setProductionRecords(
          Array.isArray(productionData)
            ? productionData
            : (productionData?.records ?? []),
        );
        setEsgQuestions(
          Array.isArray(esgData) ? esgData : (esgData?.questions ?? []),
        );
        setOemSurveys(
          Array.isArray(oemData) ? oemData : (oemData?.surveys ?? []),
        );
        setDocuments(
          Array.isArray(docData) ? docData : (docData?.documents ?? []),
        );
        setReports(Array.isArray(repData) ? repData : (repData?.reports ?? []));
        setOpportunities(
          Array.isArray(opportunityData)
            ? opportunityData
            : (opportunityData?.opportunities ?? []),
        );
        setScenarios(
          Array.isArray(scenarioData)
            ? scenarioData
            : (scenarioData?.scenarios ?? []),
        );
        setProjects(
          Array.isArray(projectData)
            ? projectData
            : (projectData?.projects ?? []),
        );
        setDiagnosticResponses(
          Array.isArray(diagnosticResponseData)
            ? diagnosticResponseData
            : (diagnosticResponseData?.responses ?? []),
        );
      } catch (err) {
        console.error("Error fetching seeded multi-tenant states:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, [authenticated, currentUser]);

  useEffect(() => {
    if (!authenticated) return;
    const refreshOperationalLedgers = async () => {
      const [facilityData, energyData, productionData] = await Promise.all([
        safeFetchJson('/api/facilities', undefined, { facilities: [] }),
        safeFetchJson('/api/energy', undefined, { records: [] }),
        safeFetchJson('/api/production', undefined, { records: [] }),
      ]);
      setFacilities(Array.isArray(facilityData) ? facilityData : (facilityData?.facilities ?? []));
      setRecords(Array.isArray(energyData) ? energyData : (energyData?.records ?? []));
      setProductionRecords(Array.isArray(productionData) ? productionData : (productionData?.records ?? []));
    };
    window.addEventListener('balancing-carbon-ledger-updated', refreshOperationalLedgers);
    return () => window.removeEventListener('balancing-carbon-ledger-updated', refreshOperationalLedgers);
  }, [authenticated]);

  const unwrapEntity = <T,>(response: any, keys: string[]): T | null => {
    if (!response) return null;
    for (const key of keys) {
      if (response[key] && typeof response[key] === "object")
        return response[key] as T;
    }
    if (
      response.data &&
      typeof response.data === "object" &&
      !Array.isArray(response.data)
    )
      return response.data as T;
    return response as T;
  };

  // Sync state helpers
  const handleAddFacility = async (payload: any) => {
    try {
      const newFac = await safeFetchJson("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createdFacility = unwrapEntity<Facility>(newFac, ["facility"]);
      if (createdFacility?.id)
        setFacilities((prev) => [...prev, createdFacility]);

      // reload lists to reflect computed emissions & scores
      const freshFacs = await safeFetchJson("/api/facilities", undefined, []);
      setFacilities(
        Array.isArray(freshFacs) ? freshFacs : (freshFacs?.facilities ?? []),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFacility = async (id: string, payload: any) => {
    try {
      const updated = await safeFetchJson(`/api/facilities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updatedFacility = unwrapEntity<Facility>(updated, ["facility"]);
      if (updatedFacility?.id)
        setFacilities((prev) =>
          prev.map((f) => (f.id === id ? updatedFacility : f)),
        );

      // reload list to capture recalculations
      const freshFacs = await safeFetchJson("/api/facilities", undefined, []);
      setFacilities(
        Array.isArray(freshFacs) ? freshFacs : (freshFacs?.facilities ?? []),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    try {
      const deleted = await safeFetchJson(
        `/api/facilities/${id}`,
        { method: "DELETE" },
        { success: true },
      );
      if (!deleted) return;
      setFacilities((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRecord = async (payload: any) => {
    try {
      const newRec = await safeFetchJson("/api/energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createdRecord = unwrapEntity<EnergyRecord>(newRec, [
        "record",
        "energyRecord",
      ]);
      if (createdRecord?.id) setRecords((prev) => [createdRecord, ...prev]);

      // Trigger recalculation reload across facilities
      const facData = await safeFetchJson("/api/facilities", undefined, []);
      const energyData = await safeFetchJson("/api/energy", undefined, []);
      setFacilities(
        Array.isArray(facData) ? facData : (facData?.facilities ?? []),
      );
      setRecords(
        Array.isArray(energyData) ? energyData : (energyData?.records ?? []),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const deleted = await safeFetchJson(
        `/api/energy/${id}`,
        { method: "DELETE" },
        { success: true },
      );
      if (!deleted) return;
      setRecords((prev) => prev.filter((record) => record.id !== id));

      const facData = await safeFetchJson("/api/facilities", undefined, []);
      const energyData = await safeFetchJson("/api/energy", undefined, []);
      setFacilities(
        Array.isArray(facData) ? facData : (facData?.facilities ?? []),
      );
      setRecords(
        Array.isArray(energyData) ? energyData : (energyData?.records ?? []),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRecord = async (id: string, payload: any) => {
    try {
      const updated = await safeFetchJson(`/api/energy/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updatedRecord = unwrapEntity<EnergyRecord>(updated, [
        "record",
        "energyRecord",
      ]);
      if (updatedRecord?.id) {
        setRecords((prev) =>
          prev.map((record) => (record.id === id ? updatedRecord : record)),
        );
      }

      const facData = await safeFetchJson("/api/facilities", undefined, []);
      const energyData = await safeFetchJson("/api/energy", undefined, []);
      setFacilities(
        Array.isArray(facData) ? facData : (facData?.facilities ?? []),
      );
      setRecords(
        Array.isArray(energyData) ? energyData : (energyData?.records ?? []),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProduction = async (payload: any) => {
    try {
      const newProduction = await safeFetchJson("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createdProduction = unwrapEntity<ProductionRecord>(newProduction, [
        "record",
        "productionRecord",
      ]);
      if (createdProduction?.id) {
        setProductionRecords((prev) => [createdProduction, ...prev]);
      }

      const productionData = await safeFetchJson("/api/production", undefined, []);
      setProductionRecords(
        Array.isArray(productionData)
          ? productionData
          : (productionData?.records ?? []),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefreshDiagnostics = async (params?: {
    facilityId?: string;
    startDate?: string;
    endDate?: string;
    currentMonth?: string;
    previousMonth?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const diagnostics = await safeFetchJson(
      `/api/diagnostics${query.toString() ? `?${query.toString()}` : ""}`,
      undefined,
      null,
    );
    if (!diagnostics) return;
    setDiagnosticFindings(diagnostics.findings ?? []);
    setDiagnosticCompleteness(diagnostics.completeness ?? null);
    setDiagnosticComparison(diagnostics.comparison ?? null);
    setDiagnosticResponses(diagnostics.responses ?? []);
  };

  const handleSaveDiagnosticResponse = async (payload: any) => {
    const saved = await safeFetchJson("/api/diagnostic-responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const response = unwrapEntity<DiagnosticQuestionResponse>(saved, ["response"]);
    if (response?.id) {
      setDiagnosticResponses((prev) => {
        const next = prev.filter((item) => item.id !== response.id);
        return [response, ...next];
      });
    }
  };

  const handleCreateOpportunity = async (payload: any) => {
    const created = await safeFetchJson("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const opportunity = unwrapEntity<ReductionOpportunity>(created, ["opportunity"]);
    if (opportunity?.id) setOpportunities((prev) => [opportunity, ...prev]);
  };

  const handleCreateScenario = async (payload: any) => {
    const created = await safeFetchJson("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const scenario = unwrapEntity<ReductionScenario>(created, ["scenario"]);
    if (scenario?.id) setScenarios((prev) => [scenario, ...prev]);
  };

  const handleCreateProject = async (payload: any) => {
    const created = await safeFetchJson("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const project = unwrapEntity<DecarbonizationProject>(created, ["project"]);
    if (project?.id) {
      setProjects((prev) => [project, ...prev]);
      if (project.opportunityId) {
        const opportunityData = await safeFetchJson("/api/opportunities", undefined, []);
        setOpportunities(
          Array.isArray(opportunityData)
            ? opportunityData
            : (opportunityData?.opportunities ?? []),
        );
      }
    }
  };

  const handleUpdateQuestion = async (id: string, payload: any) => {
    try {
      const updated = await safeFetchJson(`/api/esg/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (updated) {
        setEsgQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSurvey = async (
    title: string,
    oemName: string,
    dueDate: string,
  ) => {
    try {
      const newSurvey = await safeFetchJson("/api/oem-surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, oemName, dueDate }),
      });
      const createdSurvey = unwrapEntity<OEMQuestionnaire>(newSurvey, [
        "survey",
        "questionnaire",
      ]);
      if (createdSurvey?.id) setOemSurveys((prev) => [...prev, createdSurvey]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveOEMQuestion = async (
    surveyId: string,
    questionId: string,
    status: any,
    suggestedAnswer?: string,
  ) => {
    try {
      await safeFetchJson(`/api/oem-surveys/${surveyId}/approve-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, status, suggestedAnswer }),
      });

      // Reload questionnaires to preserve deep updates
      const freshSurveys = await safeFetchJson(
        "/api/oem-surveys",
        undefined,
        [],
      );
      setOemSurveys(
        Array.isArray(freshSurveys)
          ? freshSurveys
          : (freshSurveys?.surveys ?? []),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDocument = async (payload: any) => {
    try {
      const newDoc = payload instanceof FormData
        ? await fetch("/api/documents/upload", { method: "POST", headers: getAuthenticatedHeaders(), body: payload }).then((response) => parseJsonResponse(response, null))
        : await safeFetchJson("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const createdDocument = unwrapEntity<Document>(newDoc, ["document"]);
      if (createdDocument?.id)
        setDocuments((prev) => [createdDocument, ...prev]);
      return createdDocument;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const deleted = await safeFetchJson(
        `/api/documents/${id}`,
        { method: "DELETE" },
        { success: true },
      );
      if (!deleted) return;
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrg = async (updatedOrgPayload: any) => {
    try {
      const updated = await safeFetchJson("/api/organisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedOrgPayload),
      });
      if (updated) {
        setOrganisation(updated);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleAddReport = async (
    title: string,
    type: string,
    period: string,
    summary: string,
  ) => {
    try {
      const report = await safeFetchJson("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, period, summary }),
      });
      const createdReport = unwrapEntity<any>(report, ["report"]);
      if (createdReport?.id) setReports((prev) => [createdReport, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  // Real Log In Handler
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail || !loginPassword) {
      setLoginError("All fields are required.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        const responseText = await res.text();
        let errData: any = null;
        try { errData = responseText ? JSON.parse(responseText) : null; } catch { errData = null; }
        const requestId = res.headers.get("x-request-id");
        setLoginError(
          errData?.error || `Login service returned an unexpected response (${res.status})${requestId ? ` · Request ${requestId}` : ""}.`,
        );
        return;
      }

      const responseText = await res.text();
      const session = responseText ? JSON.parse(responseText) : null;
      if (!session?.authenticated || !session?.accessToken || !session?.user) {
        setLoginError("Login response did not contain a valid authenticated session.");
        return;
      }
      localStorage.setItem("balancing_carbon_session", JSON.stringify(session));
      setCurrentUser(session.user);
      setOrganisation(session.organisation);
      setAuthenticated(true);
      setCurrentView("dashboard-overview");
    } catch (err) {
      console.error(err);
      setLoginError("Server connection error. Please try again.");
    }
  };

  // Real Sign Up Handler
  const handleFormSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    if (!signupName || !signupEmail || !signupPassword || !signupOrgName) {
      setSignupError("All fields are required.");
      return;
    }
    if (signupPassword.length < 10 || !/[A-Za-z]/.test(signupPassword) || !/\d/.test(signupPassword)) {
      setSignupError("Use at least 10 characters with a letter and number.");
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          organisationName: signupOrgName,
          planId: signupPlanId,
          billingInterval: signupBillingInterval,
        }),
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Failed to register account." }));
        setSignupError(errData.error || "Failed to register account.");
        return;
      }

      const session = await res.json();
      localStorage.setItem("balancing_carbon_session", JSON.stringify(session));
      setCurrentUser(session.user);
      setOrganisation(session.organisation);
      setAuthenticated(true);
      setCurrentView("dashboard-overview");
      // Reset signup fields
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupOrgName("");
    } catch (err) {
      console.error(err);
      setSignupError("Server connection error. Please try again.");
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setPasswordResetMessage("");
    if (!loginEmail) { setLoginError("Enter your corporate email address."); return; }
    try {
      const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: loginEmail }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setLoginError(data.error || "Unable to request password reset."); return; }
      setPasswordResetMessage("If this account exists, a password reset link has been sent.");
    } catch { setLoginError("Server connection error. Please try again."); }
  };

  // Log out
  const handleLogout = () => {
    localStorage.removeItem("balancing_carbon_session");
    setAuthenticated(false);
    setCurrentUser(null);
    setOrganisation(null);
    setFacilities([]);
    setRecords([]);
    setProductionRecords([]);
    setEsgQuestions([]);
    setOemSurveys([]);
    setDocuments([]);
    setReports([]);
    setCurrentView("home");
  };

  // Custom Company Profile Subview inside Dashboard
  const renderCompanyProfile = () => {
    if (!organisation) {
      return (
        <div className="bg-white p-6 rounded-xl border border-brand-border text-sm text-gray-500">
          Organisation profile could not be loaded. Please refresh or sign in
          again.
        </div>
      );
    }
    const profile = organisationDraft ?? organisation;
    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl border border-brand-border">
          <h1 className="text-xl font-extrabold text-brand-charcoal">
            Corporate Profile
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Configure organization entities, industrial licenses, and carbon
            targets.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-brand-border rounded-xl p-5 lg:col-span-2 space-y-4 text-xs">
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal">
              Entity Metadata
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="organisation-name" className="block text-gray-400 font-mono mb-1">
                  Company Registered Name
                </label>
                <input
                  id="organisation-name"
                  type="text"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-medium text-brand-charcoal"
                  value={profile.name}
                  onChange={(e) => { setOrganisationDraft({ ...profile, name: e.target.value }); setOrganisationSaveState(""); }}
                />
              </div>
              <div>
                <label htmlFor="organisation-employees" className="block text-gray-400 font-mono mb-1">
                  Employee Count
                </label>
                <input
                  id="organisation-employees"
                  type="number"
                  min="0"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal"
                  value={profile.employeeCount}
                  onChange={(e) => { setOrganisationDraft({ ...profile, employeeCount: Math.max(0, parseInt(e.target.value, 10) || 0) }); setOrganisationSaveState(""); }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="organisation-location" className="block text-gray-400 font-mono mb-1">
                  HQ Corporate Office Address
                </label>
                <input
                  id="organisation-location"
                  type="text"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite text-brand-charcoal"
                  value={profile.location}
                  onChange={(e) => { setOrganisationDraft({ ...profile, location: e.target.value }); setOrganisationSaveState(""); }}
                />
              </div>
              <div>
                <label htmlFor="organisation-industry" className="block text-gray-400 font-mono mb-1">
                  Primary Industrial Classification
                </label>
                <input
                  id="organisation-industry"
                  type="text"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite text-brand-charcoal"
                  value={profile.industry}
                  onChange={(e) => { setOrganisationDraft({ ...profile, industry: e.target.value }); setOrganisationSaveState(""); }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 border-t border-brand-border/50 pt-4">
              <div>
                <label htmlFor="organisation-target" className="block text-gray-400 font-mono mb-1">
                  Net Carbon Target reduction
                </label>
                <input
                  id="organisation-target"
                  type="number"
                  min="0"
                  max="100"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal"
                  value={profile.targetReductionPercent}
                  onChange={(e) => { setOrganisationDraft({ ...profile, targetReductionPercent: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) }); setOrganisationSaveState(""); }}
                />
              </div>
              <div>
                <label htmlFor="organisation-reporting-year" className="block text-gray-400 font-mono mb-1">
                  Active Reporting Cycle
                </label>
                <input
                  id="organisation-reporting-year"
                  type="text"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal"
                  value={profile.reportingYear}
                  onChange={(e) => { setOrganisationDraft({ ...profile, reportingYear: e.target.value }); setOrganisationSaveState(""); }}
                />
              </div>
              <div>
                <label htmlFor="organisation-id" className="block text-gray-400 font-mono mb-1">
                  Organisation ID
                </label>
                <input
                  id="organisation-id"
                  type="text"
                  readOnly
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal"
                  value={profile.id}
                />
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
              {organisationSaveState === "saved" && <span role="status" className="text-xs text-brand-forest">Organisation profile saved.</span>}
              {organisationSaveState === "error" && <span role="alert" className="text-xs text-brand-red">Unable to save the profile. Please try again.</span>}
              <button
                type="button"
                disabled={organisationSaveState === "saving"}
                onClick={async () => {
                  setOrganisationSaveState("saving");
                  setOrganisationSaveState(await handleUpdateOrg(profile) ? "saved" : "error");
                }}
                className="bg-brand-forest hover:bg-brand-green-sec text-white px-5 py-2 rounded font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> {organisationSaveState === "saving" ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-brand-charcoal text-white p-5 rounded-xl border border-white/5 space-y-4">
              <h4 className="text-xs font-bold font-mono text-brand-sage uppercase tracking-wider">
                Multi-Tenant Tenant ID
              </h4>
              <p className="text-xs text-gray-400 leading-normal font-mono">
                CLAIM: org-apex-precision-prod-001
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">
                This client context maintains a unique encryption seed isolating
                precision forging machinery limits and pollution board filings
                from sibling suppliers on the Balancing Carbon cloud
                infrastructure.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Custom Reports Centre Subview
  const renderReportsCentre = () => {
    const handleCreateReport = (e: React.FormEvent) => {
      e.preventDefault();
      if (!reportTitle) return;
      handleAddReport(reportTitle, reportType, reportPeriod, reportSummary);
      setReportTitle("");
      setReportSummary("");
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl border border-brand-border">
          <h1 className="text-xl font-extrabold text-brand-charcoal">
            Reports Centre
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Generate exportable audit worksheets, BRSR Core submissions, and OEM
            ESG files.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal">
              Compile Audit Report
            </h3>

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-gray-500 font-mono mb-1">
                  Report Sheet Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FY25 Carbon Verification Worksheet"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-gray-500 font-mono mb-1">
                  Filing/Audit standard *
                </label>
                <select
                  className="w-full border border-brand-border p-2.5 rounded bg-white text-xs"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="BRSR Core Audit Report">
                    BRSR Core Audit Report (SEBI India)
                  </option>
                  <option value="ISO 14064 GHG Statement">
                    ISO 14064 GHG Statement
                  </option>
                  <option value="OEM Supplier Compliance Deck">
                    OEM Supplier Compliance Deck
                  </option>
                  <option value="Scope 2 Electricity Offsetting Summary">
                    Scope 2 Electricity Offsetting Summary
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-mono mb-1">
                  Filing Cycle *
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-gray-500 font-mono mb-1">
                  Scope Executive Summary Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Compiled for Maruti Suzuki tier-1 compliance folders."
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite"
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-forest hover:bg-brand-green-sec text-white py-2.5 rounded font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                Compile Export Package
              </button>
            </form>
          </div>

          <div className="bg-white border border-brand-border rounded-xl p-5 lg:col-span-2 space-y-4 text-xs">
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal">
              Generated Audit Packages ({reports.length})
            </h3>

            <div className="space-y-3">
              {reports.map((rep: any) => (
                <div
                  key={rep.id}
                  className="p-4 bg-brand-offwhite rounded-xl border border-brand-border/60 flex justify-between items-center gap-4 hover:shadow-sm transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-brand-charcoal font-mono text-xs">
                      {rep.title}
                    </h4>
                    <p className="text-gray-500 text-[11px] mt-1 leading-snug">
                      {rep.summary ||
                        "Compiled automatically from electricity invoices and diesel ledger bills."}
                    </p>
                    <div className="text-[10px] text-gray-400 font-mono mt-1 flex gap-3">
                      <span>Type: {rep.type}</span>
                      <span>Cycle: {rep.period}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentView("dashboard-reports")}
                      className="flex items-center gap-1.5 p-2 bg-white hover:bg-gray-50 text-brand-forest rounded border border-brand-border"
                      title="Open this report in Reporting Studio"
                    >
                      <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">Open studio</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const workspaceMeta: Partial<Record<ViewState, { title: string; section: string }>> = {
    "dashboard-overview": { title: "Command Center", section: "Overview" },
    "dashboard-company": { title: "Organisation Profile", section: "Command Center" },
    "dashboard-facilities": { title: "Facilities", section: "Command Center" },
    "dashboard-calculator": { title: "Carbon Calculator", section: "Carbon Inventory" },
    "dashboard-energy": { title: "Activity & Production Ledgers", section: "Carbon Inventory" },
    "dashboard-emissions-scope1": { title: "Scope 1 Inventory", section: "Carbon Inventory" },
    "dashboard-emissions-scope2": { title: "Scope 2 Inventory", section: "Carbon Inventory" },
    "dashboard-emissions-scope3": { title: "Scope 3 Inventory", section: "Carbon Inventory" },
    "dashboard-intelligence": { title: "Carbon Intelligence", section: "Intelligence" },
    "dashboard-analytics": { title: "Analytics Studio", section: "Intelligence" },
    "dashboard-sustainability": { title: "Sustainability Planner", section: "Intelligence" },
    "dashboard-collaboration": { title: "Collaboration", section: "Reporting & Evidence" },
    "dashboard-public-portal": { title: "Public ESG Portal", section: "Reporting & Evidence" },
    "dashboard-reports": { title: "Reporting Studio", section: "Reporting & Evidence" },
    "dashboard-documents": { title: "Document Vault", section: "Reporting & Evidence" },
    "dashboard-questionnaires": { title: "OEM Questionnaires", section: "Reporting & Evidence" },
    "dashboard-esg": { title: "ESG Readiness", section: "Reporting & Evidence" },
    "dashboard-ai-assistant": { title: "Carbon Copilot", section: "Intelligence" },
    "dashboard-metadata": { title: "Metadata Studio", section: "System" },
    "dashboard-data-platform": { title: "Enterprise Data Hub", section: "System" },
    "dashboard-marketplace": { title: "Marketplace", section: "System" },
    "dashboard-admin": { title: "Admin Console", section: "Administration" },
    "dashboard-platform-admin": { title: "Platform Admin Console", section: "Balancing Carbon Operations" },
    "dashboard-settings": { title: "System Settings", section: "System" },
    "dashboard-help": { title: "Help & Learning", section: "System" },
  };
  const activeWorkspace = workspaceMeta[currentView] ?? { title: "Balancing Carbon", section: "Workspace" };

  const publicPortalMatch = window.location.pathname.match(/^\/portal\/([a-z0-9-]+)\/?$/i);
  if (publicPortalMatch) {
    return <Suspense fallback={<DashboardModuleLoader label="Loading public ESG portal..." />}><PublicESGPortal slug={publicPortalMatch[1]} /></Suspense>;
  }

  // Render Client Dashboard Container
  if (authenticated) {
    return (
      <div
        className="flex h-screen bg-brand-offwhite overflow-hidden text-brand-charcoal font-sans"
        id="client-dashboard-app"
      >
        <FirstRunWelcome onNavigate={setCurrentView} onOpenHelp={() => setCurrentView("dashboard-help")} />
        <ContextHelpDrawer view={currentView} open={contextHelpOpen} onClose={() => setContextHelpOpen(false)} onOpenLearning={() => { setContextHelpOpen(false); setCurrentView("dashboard-help"); }} />
        {/* Navigation Sidebar */}
        <DashboardSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout}
          user={currentUser}
          organisation={organisation}
          mobileOpen={dashboardNavOpen}
          onMobileClose={() => setDashboardNavOpen(false)}
        />

        {/* Action center workspace viewport */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          {/* Action Bar / Status Topbar */}
          <header className="dashboard-topbar bg-white border-b border-brand-border/60 min-h-16 flex items-center justify-between px-4 sm:px-6 py-2 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={() => setDashboardNavOpen(true)} aria-label="Open navigation" className="dashboard-menu-button studio-mini"><Menu /></button>
              <div className="dashboard-workspace-title min-w-0">
              <p className="text-[10px] text-gray-400 font-mono uppercase truncate">{activeWorkspace.section} / {organisation?.name || "Organisation"}</p>
              <h1 className="text-sm sm:text-base font-black truncate">{activeWorkspace.title}</h1>
              <span className="text-[11px] font-mono uppercase bg-brand-sage text-brand-forest px-2.5 py-1 rounded-lg font-bold tracking-wider">
                Enterprise Workspace
              </span>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                All platform modules available
              </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setContextHelpOpen(true)}
                aria-label="Open contextual help"
                className="border border-brand-border hover:bg-brand-offwhite text-brand-charcoal px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                data-help-id="context-help"
              >
                <HelpCircle className="w-4 h-4" /> <span className="hidden sm:inline">Help</span>
              </button>
              <button
                onClick={() => setCurrentView("dashboard-ai-assistant")}
                className="bg-brand-forest hover:bg-brand-green-sec text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="hidden sm:inline">Ask Carbon AI</span><span className="sm:hidden">AI</span>
              </button>
            </div>
          </header>

          {/* Subview Viewport */}
          <main id="dashboard-content" className="min-w-0 flex-1 overflow-y-auto p-6 space-y-6" tabIndex={-1}>
            {loading ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-gray-400 flex-col gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-brand-forest" />
                <span>Loading secure multi-tenant factory logs...</span>
              </div>
            ) : (
              <Suspense fallback={<DashboardModuleLoader label="Loading workspace..." />}>
                {currentView === "dashboard-overview" && (
                  <>
                  <OnboardingWidget onNavigate={setCurrentView} onOpenHelp={() => setCurrentView("dashboard-help")} />
                  <DashboardOverview
                    organisation={organisation}
                    facilities={facilities}
                    records={records}
                    productionRecords={productionRecords}
                    esgQuestions={esgQuestions}
                    oemSurveys={oemSurveys}
                    documents={documents}
                    reports={reports}
                    opportunities={opportunities}
                    projects={projects}
                    onNavigate={setCurrentView}
                  /></>
                )}
                {currentView === "dashboard-facilities" && (
                  <FacilityManagement
                    facilities={facilities}
                    onAddFacility={handleAddFacility}
                    onUpdateFacility={handleUpdateFacility}
                    onDeleteFacility={handleDeleteFacility}
                  />
                )}
                {currentView === "dashboard-energy" && (
                  <EnergyTracking
                    records={records}
                    productionRecords={productionRecords}
                    facilities={facilities}
                    onAddRecord={handleAddRecord}
                    onUpdateRecord={handleUpdateRecord}
                    onAddProduction={handleAddProduction}
                    onDeleteRecord={handleDeleteRecord}
                  />
                )}
                {currentView === "dashboard-calculator" && (
                  <CarbonEngineUI scopeType="all" facilities={facilities} records={records} onNavigate={setCurrentView} />
                )}

                {/* Carbon engine explorer views */}
                {currentView === "dashboard-emissions-scope1" && (
                  <CarbonEngineUI
                    scopeType="scope-1"
                    facilities={facilities}
                    records={records}
                    onNavigate={setCurrentView}
                  />
                )}
                {currentView === "dashboard-emissions-scope2" && (
                  <CarbonEngineUI
                    scopeType="scope-2"
                    facilities={facilities}
                    records={records}
                    onNavigate={setCurrentView}
                  />
                )}
                {currentView === "dashboard-emissions-scope3" && (
                  <CarbonEngineUI
                    scopeType="scope-3"
                    facilities={facilities}
                    records={records}
                    onNavigate={setCurrentView}
                  />
                )}
                {currentView === "dashboard-intelligence" && (
                  <EntitlementGate entitlement="projects.create" title="Carbon Intelligence">
                    <Suspense fallback={<DashboardModuleLoader label="Loading Carbon Intelligence..." />}>
                      <CarbonIntelligenceHub
                        facilities={facilities}
                        findings={diagnosticFindings}
                        completeness={diagnosticCompleteness}
                        comparison={diagnosticComparison}
                        diagnosticResponses={diagnosticResponses}
                        opportunities={opportunities}
                        scenarios={scenarios}
                        projects={projects}
                        onRefreshDiagnostics={handleRefreshDiagnostics}
                        onSaveDiagnosticResponse={handleSaveDiagnosticResponse}
                        onCreateOpportunity={handleCreateOpportunity}
                        onCreateScenario={handleCreateScenario}
                        onCreateProject={handleCreateProject}
                      />
                    </Suspense>
                  </EntitlementGate>
                )}

                {/* ESG & Surveys */}
                {currentView === "dashboard-esg" && (
                  <EntitlementGate entitlement="compliance.manage" title="Compliance Workflows"><ESGAssessmentModule questions={esgQuestions} onUpdateQuestion={handleUpdateQuestion} documents={documents} /></EntitlementGate>
                )}
                {currentView === "dashboard-questionnaires" && (
                  <EntitlementGate entitlement="compliance.manage" title="OEM Workflows"><OEMQuestionnaireModule surveys={oemSurveys} onAddSurvey={handleAddSurvey} onApproveQuestion={handleApproveOEMQuestion} /></EntitlementGate>
                )}

                {/* Documents & Reports */}
                {currentView === "dashboard-documents" && (
                  <DocumentCentre
                    documents={documents}
                    onAddDocument={handleAddDocument}
                    onDeleteDocument={handleDeleteDocument}
                  />
                )}
                {currentView === "dashboard-reports" && <ReportingWorkspace />}
                {currentView === "dashboard-metadata" && (
                  <Suspense fallback={<DashboardModuleLoader label="Loading Metadata Studio..." />}>
                    <MetadataStudio />
                  </Suspense>
                )}
                {currentView === "dashboard-data-platform" && (
                  <Suspense fallback={<DashboardModuleLoader label="Loading Enterprise Data Hub..." />}>
                    <EnterpriseDataHub />
                  </Suspense>
                )}
                {currentView === "dashboard-collaboration" && (
                  <EntitlementGate entitlement="collaboration.workflows" title="Workflow and Collaboration">
                    <Suspense fallback={<DashboardModuleLoader label="Loading Collaboration Center..." />}>
                      <CollaborationCenter />
                    </Suspense>
                  </EntitlementGate>
                )}
                {currentView === "dashboard-public-portal" && (
                  <EntitlementGate entitlement="public.portal" title="Public ESG Portal">
                    <Suspense fallback={<DashboardModuleLoader label="Loading Public ESG Portal administration..." />}>
                      <PublicPortalAdmin />
                    </Suspense>
                  </EntitlementGate>
                )}
                {currentView === "dashboard-marketplace" && (
                  <EntitlementGate entitlement="marketplace.catalog" title="Marketplace & Integrations">
                    <Suspense fallback={<DashboardModuleLoader label="Loading Marketplace..." />}>
                      <MarketplaceHub />
                    </Suspense>
                  </EntitlementGate>
                )}
                {currentView === "dashboard-admin" && (
                  <Suspense fallback={<DashboardModuleLoader label="Loading Admin Console..." />}>
                    <AdminDashboard
                      user={currentUser}
                      organisation={organisation}
                      facilities={facilities}
                      records={records}
                      documentsCount={documents.length}
                      reportsCount={reports.length}
                      onNavigate={setCurrentView}
                    />
                  </Suspense>
                )}
                {currentView === "dashboard-platform-admin" && (
                  <Suspense fallback={<DashboardModuleLoader label="Loading Platform Admin Console..." />}>
                    <PlatformAdminConsole user={currentUser} onNavigate={setCurrentView} />
                  </Suspense>
                )}
                {currentView === "dashboard-help" && <LearningCentre onNavigate={setCurrentView} />}
                {currentView === "dashboard-analytics" && (
                  <EntitlementGate entitlement="analytics.trends" title="Analytics Studio">
                    <Suspense fallback={<DashboardModuleLoader label="Loading Analytics Studio..." />}><AnalyticsStudio /></Suspense>
                  </EntitlementGate>
                )}
                {currentView === "dashboard-sustainability" && <Suspense fallback={<DashboardModuleLoader label="Loading Sustainability Planner..."/>}><SustainabilityIntelligence/></Suspense>}

                {/* Company profile entity updates */}
                {currentView === "dashboard-company" && renderCompanyProfile()}
                {currentView === "dashboard-settings" && <SubscriptionSettings />}

                {/* Smart Chatbot */}
                {currentView === "dashboard-ai-assistant" && (
                  <AIAssistantModule onNavigate={setCurrentView} />
                )}
              </Suspense>
            )}
          </main>
        </div>
      </div>
    );
  }

  // Render Public Website Router
  return (
    <div
      className="min-h-screen bg-brand-offwhite text-brand-charcoal font-sans flex flex-col justify-between"
      id="public-website"
    >
      <PublicSeo view={currentView} slug={publicContentSlug} />
      <a className="bc-skip-link" href="#public-main-content">Skip to content</a>
      {/* Public Header bar with Asymmetric logo */}
      <header className="bc-site-header bg-white border-b border-brand-border/60 flex items-center sticky top-0 z-[100] px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <button
            onClick={() => navigatePublic("home")}
            className="cursor-pointer v1-public-logo"
            aria-label="Balancing Carbon home"
          >
            <AsymmetricInfinityLogo size="md" />
          </button>

          {/* Desktop Links */}
          <nav className="hidden min-[980px]:flex items-center gap-6 text-sm font-semibold text-brand-charcoal" aria-label="Main navigation">
            {[
              ["Services", "services"],
              ["Industries", "industries"],
              ["AI", "ai"],
              ["Resources", "resources"],
              ["Pricing", "pricing"],
              ["About", "about"],
            ].map(([label, view]) => (
              <button
                key={view}
                onClick={() => navigatePublic(view as ViewState)}
                aria-current={currentView === view ? "page" : undefined}
                className={`bc-public-nav-link ${currentView === view ? "is-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Action Login triggers */}
          <div className="hidden min-[980px]:flex items-center gap-2">
            <button className="bc-consult-button" onClick={() => navigatePublic("contact")}>Book consultation</button>
            <button
              onClick={() => {
                setIsSignUpMode(false);
                navigatePublic("login");
              }}
              className="v1-portal-button"
              aria-label="Open Client Portal"
              title="Client Portal"
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-[980px]:hidden text-brand-charcoal hover:text-brand-forest"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-navigation"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="public-mobile-navigation" className="bc-mobile-menu min-[980px]:hidden bg-white border-b border-brand-border/60 py-4 px-6 space-y-3 font-semibold text-sm">
          {[
            ["Home", "home"],
            ["Services", "services"],
            ["Industries", "industries"],
            ["Governed AI", "ai"],
            ["Tools", "tools"],
            ["Resources", "resources"],
            ["Pricing", "pricing"],
            ["About", "about"],
            ["Contact", "contact"],
          ].map(([label, view]) => (
            <button key={view} onClick={() => navigatePublic(view as ViewState)} className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest">{label}</button>
          ))}
          <div className="border-t border-brand-border/40 pt-3 flex flex-col gap-2">
            <button onClick={() => navigatePublic("contact")} className="w-full text-center py-2 text-brand-forest border border-brand-border rounded">Book consultation</button>
            <button
              onClick={() => {
                setIsSignUpMode(false);
                navigatePublic("login");
              }}
              className="w-full text-center py-2 text-brand-charcoal border border-brand-border rounded"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsSignUpMode(true);
                navigatePublic("login");
              }}
              className="w-full text-center py-2 bg-brand-forest text-white rounded font-bold"
            >
              Register Company
            </button>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="flex-grow" id="public-main-content">
        {/* View: Public Homepage */}
        {currentView === "home" && (
          <MarketingHome
            onNavigate={navigatePublic}
            onLogin={() => {
              setIsSignUpMode(false);
              navigatePublic("login");
            }}
            onRegister={() => {
              setIsSignUpMode(true);
              navigatePublic("login");
            }}
          />
        )}
        {false && (
          <div className="space-y-24 pb-24">
            {/* HERO SECTION */}
            <section className="bg-white border-b border-brand-border/40 py-20 px-6">
              <div className="max-w-5xl mx-auto text-center space-y-6">
                {/* Small notification badge */}
                <div className="inline-flex items-center gap-1.5 bg-brand-sage/40 text-brand-forest border border-brand-border px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mx-auto">
                  <ShieldCheck className="w-3.5 h-3.5" /> Made for Indian
                  Manufacturers, Exporters, and MSMEs
                </div>

                <h1 className="text-4xl sm:text-5xl font-black text-brand-charcoal tracking-tight max-w-4xl mx-auto leading-[1.1]">
                  Industrial Carbon Intelligence &{" "}
                  <span className="text-brand-forest">ESG Readiness</span> Built
                  for Indian Exporters
                </h1>

                <p className="text-sm text-gray-500 max-w-3xl mx-auto leading-relaxed">
                  Avoid compliance bottlenecks, calculate deterministic Scope 1
                  & Scope 2 footprints with IPCC/CEA factors, auto-generate
                  verified answers for OEM supplier audits, and navigate CBAM
                  export regulations securely.
                </p>

                {/* Main Conversion CTA button pair */}
                <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => setCurrentView("public-calculator")}
                    className="bg-brand-forest hover:bg-brand-green-sec text-white px-6 py-3.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer animate-pulse"
                  >
                    <Calculator className="w-4 h-4" /> Try Instant Carbon
                    Calculator
                  </button>
                  <button
                    onClick={() => setCurrentView("assessment")}
                    className="bg-brand-charcoal hover:bg-black text-white px-6 py-3.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    Start Free ESG Assessment <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsSignUpMode(false);
                      setCurrentView("login");
                    }}
                    className="bg-white hover:bg-gray-50 text-brand-charcoal border border-brand-border px-6 py-3.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    Secure Client Portal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-8 text-left">
                  <div className="bg-white/8 border border-white/15 rounded-xl p-4 backdrop-blur-sm">
                    <span className="text-[9px] font-mono uppercase text-white/55 tracking-widest block">
                      Calculation Method
                    </span>
                    <strong className="text-lg font-mono text-brand-sage block mt-1">
                      CEA + IPCC
                    </strong>
                  </div>
                  <div className="bg-white/8 border border-white/15 rounded-xl p-4 backdrop-blur-sm">
                    <span className="text-[9px] font-mono uppercase text-white/55 tracking-widest block">
                      Built For
                    </span>
                    <strong className="text-lg font-mono text-brand-sage block mt-1">
                      OEM Audits
                    </strong>
                  </div>
                  <div className="bg-white/8 border border-white/15 rounded-xl p-4 backdrop-blur-sm">
                    <span className="text-[9px] font-mono uppercase text-white/55 tracking-widest block">
                      Data Model
                    </span>
                    <strong className="text-lg font-mono text-brand-sage block mt-1">
                      Multi-Tenant
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            {/* THE CRISIS: EXPORT & OEM COMPLIANCE */}
            <section className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono uppercase bg-red-100 text-brand-red px-2.5 py-1 rounded font-bold tracking-widest">
                    The Industrial Challenge
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-brand-charcoal leading-snug">
                    Indian Exporters Face Unprecedented ESG Audits
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Auto-OEMs like Tata Motors, Mahindra, and Maruti Suzuki,
                    alongside European carbon border taxes (CBAM), now mandate
                    detailed, evidence-backed environmental records. Failing to
                    present structured spreadsheets, carbon calculations, and
                    verified regulatory licenses blocks you from supply chains.
                  </p>

                  <div className="space-y-3.5">
                    <div className="flex gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
                      <div>
                        <strong>No More Spreadsheet Guesswork:</strong>{" "}
                        Spreadsheets lack structured calculation logs. Auditing
                        firms (TÜV, SGS) require clear factor trails (CEA Grid
                        version 19).
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
                      <div>
                        <strong>Draft Codes Lacking Signatures:</strong> OEMs
                        flag simple verbal assurances. You need secure physical
                        linkage of vendor policies.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Illustrated stats card */}
                <div className="bg-white border border-brand-border rounded-xl p-8 space-y-6 shadow-inner relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-brand-forest/5 rounded-full blur-2xl pointer-events-none" />
                  <span className="text-[10px] font-mono uppercase text-gray-400">
                    Carbon Border Taxes (CBAM)
                  </span>
                  <div className="text-5xl font-black font-mono tracking-tight text-brand-charcoal">
                    2026
                  </div>
                  <p className="text-xs text-gray-500 leading-normal">
                    Starting 2026, European customs require verified embedded
                    emissions declarations for incoming steel, metal components,
                    chemicals, and industrial shipments.
                  </p>
                  <div className="border-t border-brand-border/60 pt-4 font-mono text-[10px] text-brand-forest flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4" /> Fully mapped to CBAM
                    filing mandates
                  </div>
                </div>
              </div>
            </section>

            {/* SERVICES SOLUTIONS SECTION */}
            <section className="bg-white py-20 border-y border-brand-border/40 px-6">
              <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-mono uppercase text-brand-forest tracking-widest font-bold">
                    Comprehensive Capabilities
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-brand-charcoal">
                    The Balancing Carbon Technology Stack
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Service 1 */}
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border/80 space-y-4">
                    <div className="p-3 bg-brand-forest/10 rounded-lg text-brand-forest w-fit">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-brand-charcoal font-mono uppercase tracking-wide">
                      Deterministic Carbon Engine
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Zero-deviation carbon accounting for Scope 1 stationary
                      combustions and location-based Scope 2 grids, conforming
                      directly to statutory Indian CEA and IPCC standards.
                    </p>
                  </div>

                  {/* Service 2 */}
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border/80 space-y-4">
                    <div className="p-3 bg-brand-forest/10 rounded-lg text-brand-forest w-fit">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-brand-charcoal font-mono uppercase tracking-wide">
                      OEM Questionnaire Assistance
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Auto-extract audit questions, map secure physical folder
                      proofs, and compile high-confidence drafts utilizing your
                      live regional factory metrics.
                    </p>
                  </div>

                  {/* Service 3 */}
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border/80 space-y-4">
                    <div className="p-3 bg-brand-forest/10 rounded-lg text-brand-forest w-fit">
                      <FolderClosed className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-brand-charcoal font-mono uppercase tracking-wide">
                      Evidence Document Vault
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Protect and isolate your State Pollution board permits,
                      electricity billing invoices, and certified audit sheets
                      in dedicated multi-tenant secure client lockers.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* DYNAMIC DASHBOARD PREVIEW SLIDE */}
            <section className="max-w-7xl mx-auto px-6 space-y-12">
              <div className="text-center space-y-2">
                <span className="text-[10px] font-mono uppercase text-brand-forest tracking-widest font-bold">
                  Interactive Platform Preview
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight text-brand-charcoal">
                  Pre-populated Tenant: Apex Precision Components
                </h2>
              </div>

              {/* Fake dashboard mockup illustration */}
              <div className="bg-brand-charcoal rounded-2xl border border-white/5 shadow-2xl overflow-hidden p-6 text-white space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <div className="w-3 h-3 bg-amber-400 rounded-full" />
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                    <span className="text-xs font-mono text-gray-400 ml-2">
                      Apex Precision Components Private Vault Cockpit
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-white/10 px-3 py-1 rounded">
                    ID: org-apex
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">
                      Scope 1 Direct
                    </span>
                    <div className="text-2xl font-mono font-bold mt-1 text-brand-sage">
                      167.3 t
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">
                      Scope 2 Grid
                    </span>
                    <div className="text-2xl font-mono font-bold mt-1 text-brand-sage">
                      851.6 t
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">
                      Renewable Share
                    </span>
                    <div className="text-2xl font-mono font-bold mt-1 text-brand-sage">
                      34.5%
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">
                      ESG Score
                    </span>
                    <div className="text-2xl font-mono font-bold mt-1 text-brand-sage">
                      72%
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-lg border border-white/5 text-xs flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <AlertTriangle className="w-4 h-4 text-brand-amber animate-pulse" />
                    <span>
                      <strong>MPCB Alert:</strong> Pune stamping unit Consent to
                      Operate (CTO) application under review.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsSignUpMode(false);
                      setCurrentView("login");
                    }}
                    className="text-[11px] font-mono text-brand-sage hover:underline flex items-center gap-1 font-bold"
                  >
                    Open Client Portal <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </section>

            {/* INDUSTRIAL SECTORS */}
            <section className="bg-white py-20 border-t border-brand-border/40 px-6">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono uppercase text-brand-forest tracking-widest font-bold">
                    Focus Geographies & Industries
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-brand-charcoal">
                    Supporting India's Manufacturing Backbone
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Our platform is custom-built for high-intensity industrial
                    sectors operating in metalworking hubs like Pune, Ludhiana,
                    Chennai, Mohali, and Faridabad.
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-brand-charcoal font-mono">
                    <div className="p-3 bg-brand-offwhite rounded-lg border border-brand-border/60">
                      ✓ Auto Components
                    </div>
                    <div className="p-3 bg-brand-offwhite rounded-lg border border-brand-border/60">
                      ✓ Forging & Castings
                    </div>
                    <div className="p-3 bg-brand-offwhite rounded-lg border border-brand-border/60">
                      ✓ Heavy Metal Stampers
                    </div>
                    <div className="p-3 bg-brand-offwhite rounded-lg border border-brand-border/60">
                      ✓ Engineering Exporters
                    </div>
                  </div>
                </div>

                {/* Graphic illustration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border space-y-2">
                    <Building className="w-6 h-6 text-brand-forest" />
                    <span className="font-bold text-xs text-brand-charcoal block">
                      Mohali Unit
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      CNC Machining • Punjab Grid
                    </span>
                  </div>
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border space-y-2">
                    <Factory className="w-6 h-6 text-brand-forest" />
                    <span className="font-bold text-xs text-brand-charcoal block">
                      Pune Unit
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Stamping • Maharashtra Grid
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* FINAL CTA PANEL */}
            <section className="max-w-5xl mx-auto px-6 text-center">
              <div className="bg-brand-charcoal text-white rounded-2xl p-10 border border-black/10 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-44 h-44 bg-brand-forest/10 rounded-full blur-3xl pointer-events-none" />

                <h2 className="text-3xl font-extrabold tracking-tight">
                  Begin Your Compliance Journey Today
                </h2>
                <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
                  Analyze your industrial parameters, score environmental policy
                  documents, detect critical gaps, and export audit-ready BRSR
                  and OEM filing answers.
                </p>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setCurrentView("assessment")}
                    className="bg-brand-forest hover:bg-brand-green-sec text-white px-6 py-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    Take Free ESG Assessment <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentView("public-calculator")}
                    className="bg-white/10 hover:bg-white/15 text-white border border-white/10 px-6 py-3 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all"
                  >
                    Access Free Sandbox
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* View: Dedicated Public Carbon Calculator */}
        {currentView === "public-calculator" && (
          <Suspense fallback={<DashboardModuleLoader label="Loading calculator..." />}>
            <PublicCarbonCalculator
              onRegister={() => {
                setIsSignUpMode(true);
                navigatePublic("login");
              }}
            />
          </Suspense>
        )}

        {currentView === "pricing" && (
          <Suspense fallback={<DashboardModuleLoader label="Loading pricing..." />}>
            <PricingPage onStart={(planId, billingInterval) => { setSignupPlanId(planId); setSignupBillingInterval(billingInterval); setIsSignUpMode(true); navigatePublic("login"); }} />
          </Suspense>
        )}

        {/* View: Services Portfolio */}
        {currentView === "services" && (
          <ContentHubPage kind="service" onNavigate={navigatePublic} />
        )}

        {currentView === "industries" && <ContentHubPage kind="industry" onNavigate={navigatePublic} />}
        {currentView === "ai" && <ContentHubPage kind="ai" onNavigate={navigatePublic} />}
        {currentView === "tools" && <ContentHubPage kind="tool" onNavigate={navigatePublic} />}
        {currentView === "insights" && <ContentHubPage kind="insight" onNavigate={navigatePublic} />}
        {currentView === "case-studies" && <ContentHubPage kind="case-study" onNavigate={navigatePublic} />}
        {currentView === "resources" && <ResourcesHubPage onNavigate={navigatePublic} />}
        {currentView === "frameworks" && <FrameworksPage onNavigate={navigatePublic} />}
        {currentView === "trust" && <TrustPage onNavigate={navigatePublic} />}
        {currentView === "careers" && <CompanyInfoPage page="careers" onNavigate={navigatePublic} />}
        {currentView === "partners" && <CompanyInfoPage page="partners" onNavigate={navigatePublic} />}
        {currentView === "press" && <CompanyInfoPage page="press" onNavigate={navigatePublic} />}
        {currentView === "media-kit" && <CompanyInfoPage page="media-kit" onNavigate={navigatePublic} />}
        {currentView === "mission" && <StrategicInfoPage page="mission" onNavigate={navigatePublic} />}
        {currentView === "vision" && <StrategicInfoPage page="vision" onNavigate={navigatePublic} />}
        {currentView === "methodology" && <StrategicInfoPage page="methodology" onNavigate={navigatePublic} />}
        {currentView === "certifications" && <StrategicInfoPage page="certifications" onNavigate={navigatePublic} />}
        {currentView === "research" && <StrategicInfoPage page="research" onNavigate={navigatePublic} />}
        {currentView === "whitepapers" && <StrategicInfoPage page="whitepapers" onNavigate={navigatePublic} />}
        {currentView === "blog" && <StrategicInfoPage page="blog" onNavigate={navigatePublic} />}
        {currentView === "privacy" && <LegalPage page="privacy" />}
        {currentView === "terms" && <LegalPage page="terms" />}
        {currentView === "cookies" && <LegalPage page="cookies" />}
        {currentView === "service-detail" && <PublicDetailPage kind="service" slug={publicContentSlug} onNavigate={navigatePublic} />}
        {currentView === "industry-detail" && <PublicDetailPage kind="industry" slug={publicContentSlug} onNavigate={navigatePublic} />}
        {currentView === "ai-detail" && <PublicDetailPage kind="ai" slug={publicContentSlug} onNavigate={navigatePublic} />}
        {currentView === "tool-detail" && <PublicDetailPage kind="tool" slug={publicContentSlug} onNavigate={navigatePublic} />}
        {currentView === "insight-detail" && <PublicDetailPage kind="insight" slug={publicContentSlug} onNavigate={navigatePublic} />}
        {currentView === "case-study-detail" && <PublicDetailPage kind="case-study" slug={publicContentSlug} onNavigate={navigatePublic} />}
        {/* View: Free Interactive ESG Assessment form */}
        {currentView === "assessment" && (
          <div className="max-w-5xl mx-auto px-6 py-16">
            <AssessmentForm
              onLoginRequest={() => {
                setIsSignUpMode(false);
                navigatePublic("login");
              }}
            />
          </div>
        )}

        {/* View: Founding Vision / Our Vision */}
        {currentView === "about" && <AboutPublicPage onNavigate={navigatePublic} />}
        {currentView === "faq" && <FaqPublicPage onNavigate={navigatePublic} />}
        {currentView === "contact" && <ContactPublicPage onNavigate={navigatePublic} />}
        {false && (
          <div className="max-w-3xl mx-auto px-6 py-16 space-y-8 text-xs text-gray-500 leading-relaxed">
            <h1 className="text-3xl font-black text-brand-charcoal tracking-tight text-center">
              The Balancing Carbon Vision
            </h1>

            <div className="flex justify-center my-6">
              <AsymmetricInfinityLogo size="lg" />
            </div>

            <p>
              Our name, **Balancing Carbon**, represents the core challenge of
              the 21st-century manufacturing exporter: **balancing the
              relentless energy demands of heavy machinery with absolute,
              non-negotiable climate accountability.**
            </p>

            <p>
              We believe that environmental compliance should not be treated as
              a marketing slogan or a generic carbon-offset badge. For serious
              Indian manufacturing companies, ESG is a high-stakes operational
              priority. It is about preserving supplier licenses, protecting
              steel export shipments to Europe, and winning competitive bids for
              global OEM contracts.
            </p>

            <div className="p-5 bg-white border border-brand-border rounded-xl space-y-2">
              <strong className="text-brand-charcoal font-bold uppercase font-mono block">
                OUR PILLARS:
              </strong>
              <ul className="list-disc pl-4 space-y-1.5 text-gray-600 font-medium">
                <li>
                  <strong>Deterministic Integrity:</strong> We never
                  "hallucinate" emissions. Every kilogram of calculated
                  greenhouse gas is backed by verified utility invoices and
                  approved national coefficients.
                </li>
                <li>
                  <strong>Secured Multi-Tenancy:</strong> Your factory's
                  competitive secrets, energy mix patterns, and SPCB compliance
                  licenses are completely isolated at the root database tier.
                </li>
                <li>
                  <strong>Augmented Operations:</strong> AI drafts high-quality
                  compliance documentation, but human industrial compliance
                  officers maintain the absolute stamp of review and approval.
                </li>
              </ul>
            </div>

            <p className="text-center font-bold text-brand-charcoal font-mono">
              "AI DRAFTS. HUMANS APPROVE." • ESTABLISHED 2025
            </p>
          </div>
        )}

        {/* View: Secure Log In & Sign Up Portal */}
        {currentView === "login" && (
          <PublicAuthPortal
            isSignUpMode={isSignUpMode}
            isForgotPasswordMode={isForgotPasswordMode}
            loginError={loginError}
            signupError={signupError}
            passwordResetMessage={passwordResetMessage}
            loginEmail={loginEmail}
            loginPassword={loginPassword}
            signupName={signupName}
            signupEmail={signupEmail}
            signupOrgName={signupOrgName}
            signupPassword={signupPassword}
            setLoginEmail={setLoginEmail}
            setLoginPassword={setLoginPassword}
            setSignupName={setSignupName}
            setSignupEmail={setSignupEmail}
            setSignupOrgName={setSignupOrgName}
            setSignupPassword={setSignupPassword}
            onLogin={handleFormLogin}
            onSignup={handleFormSignup}
            onPasswordReset={handlePasswordReset}
            onShowReset={() => { setIsForgotPasswordMode(true); setLoginError(""); }}
            onShowSignup={() => { setIsSignUpMode(true); setIsForgotPasswordMode(false); setLoginError(""); }}
            onReturnToLogin={() => {
              setIsSignUpMode(false);
              setIsForgotPasswordMode(false);
              setPasswordResetMessage("");
              setLoginError("");
              setSignupError("");
            }}
            onHome={() => navigatePublic("home")}
          />
        )}
        {false && currentView === "login" && (
          <div className="max-w-md mx-auto px-6 py-16">
            <div className="bg-white border border-brand-border rounded-xl shadow-lg p-6 space-y-6">
              <div className="text-center space-y-1">
                <AsymmetricInfinityLogo size="md" className="mx-auto" />
                <h2 className="text-lg font-bold text-brand-charcoal font-mono uppercase tracking-wider pt-2">
                  {isForgotPasswordMode ? "Reset Password" : isSignUpMode
                    ? "Register Corporate Account"
                    : "Client Login Portal"}
                </h2>
                <p className="text-[11px] text-gray-400 font-mono">
                  {isForgotPasswordMode ? "Secure account recovery" : isSignUpMode
                    ? "Provision Isolated B2B Tenant"
                    : "Multi-Tenant Isolated Environment"}
                </p>
              </div>

              {/* Login Error Alert */}
               {!isSignUpMode && loginError && (
                <div className="p-3 bg-red-50 border border-brand-red/20 text-brand-red text-xs rounded font-mono">
                  {loginError}
                </div>
              )}

              {/* Signup Error Alert */}
              {isSignUpMode && signupError && (
                <div className="p-3 bg-red-50 border border-brand-red/20 text-brand-red text-xs rounded font-mono">
                  {signupError}
                </div>
              )}

               {isForgotPasswordMode ? (
                 <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
                   <div><label className="block text-gray-500 font-mono mb-1">Corporate Email Address</label><input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono focus:outline-none focus:ring-1 focus:ring-brand-forest" /></div>
                   {passwordResetMessage && <div className="p-3 bg-brand-sage/20 border border-brand-sage text-brand-forest text-xs rounded font-mono">{passwordResetMessage}</div>}
                   <button type="submit" className="w-full bg-brand-charcoal hover:bg-black text-white py-2.5 rounded font-mono font-bold text-xs">Send Reset Link</button>
                   <button type="button" onClick={() => { setIsForgotPasswordMode(false); setPasswordResetMessage(""); setLoginError(""); }} className="w-full text-brand-forest font-bold">Return to login</button>
                 </form>
               ) : !isSignUpMode ? (
                /* Login Form */
                <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-500 font-mono mb-1">
                      Corporate Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. manager@apexcomponents.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono focus:outline-none focus:ring-1 focus:ring-brand-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 font-mono mb-1">
                      Secure Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite focus:outline-none focus:ring-1 focus:ring-brand-forest"
                    />
                  </div>

                   <button
                    type="submit"
                    className="w-full bg-brand-charcoal hover:bg-black text-white py-2.5 rounded font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Lock className="w-4 h-4 text-brand-sage" /> Authenticate
                    Session
                   </button>
                   <button type="button" onClick={() => { setIsForgotPasswordMode(true); setLoginError(""); }} className="w-full text-brand-forest font-bold text-xs">Forgot password?</button>
                 </form>
              ) : (
                /* Signup / Provisioning Form */
                <form onSubmit={handleFormSignup} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-500 font-mono mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono focus:outline-none focus:ring-1 focus:ring-brand-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 font-mono mb-1">
                      Corporate Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rajesh@company.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono focus:outline-none focus:ring-1 focus:ring-brand-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 font-mono mb-1">
                      Organization / Factory Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Balaji Gears & Castings Pvt Ltd"
                      value={signupOrgName}
                      onChange={(e) => setSignupOrgName(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono focus:outline-none focus:ring-1 focus:ring-brand-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 font-mono mb-1">
                      Create Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite focus:outline-none focus:ring-1 focus:ring-brand-forest"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand-forest hover:bg-brand-green-sec text-white py-2.5 rounded font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Building className="w-4 h-4 text-brand-sage" /> Register &
                    Provision Tenant
                  </button>
                </form>
              )}

              <div className="border-t border-brand-border/60 pt-4 text-center text-xs">
                {isSignUpMode ? (
                  <p className="text-gray-500">
                    Already have an authorized account?{" "}
                    <button
                      onClick={() => {
                        setIsSignUpMode(false);
                        setIsForgotPasswordMode(false);
                        setSignupError("");
                      }}
                      className="text-brand-forest font-bold hover:underline font-mono"
                    >
                      Log In here
                    </button>
                  </p>
                ) : (
                  <p className="text-gray-500">
                    First time evaluating Balancing Carbon?{" "}
                    <button
                      onClick={() => {
                        setIsSignUpMode(true);
                        setIsForgotPasswordMode(false);
                        setLoginError("");
                      }}
                      className="text-brand-forest font-bold hover:underline font-mono"
                    >
                      Register your Company
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="v1-footer">
        <div className="bc-shell ep-footer-grid">
          <div className="v1-footer-brand">
            <button type="button" onClick={() => navigatePublic("home")} aria-label="Balancing Carbon home"><AsymmetricInfinityLogo size="md" variant="dark" /></button>
            <p>Governed carbon intelligence for organisations that need to measure, report and act with confidence.</p>
            <button className="v1-client-link" onClick={() => { setIsSignUpMode(false); navigatePublic("login"); }}>Open client portal <ArrowRight /></button>
          </div>
          <div>
            <h3>Platform</h3>
            <button onClick={() => navigatePublic("services")}>Services</button>
            <button onClick={() => navigatePublic("industries")}>Industries</button>
            <button onClick={() => navigatePublic("ai")}>Governed AI</button>
            <button onClick={() => navigatePublic("tools")}>Interactive tools</button>
            <button onClick={() => navigatePublic("pricing")}>Pricing</button>
          </div>
          <div>
            <h3>Resources</h3>
            <button onClick={() => navigatePublic("insights")}>Insights</button>
            <button onClick={() => navigatePublic("case-studies")}>Case studies</button>
            <button onClick={() => navigatePublic("frameworks")}>Framework library</button>
            <button onClick={() => navigatePublic("trust")}>Trust centre</button>
            <button onClick={() => navigatePublic("faq")}>FAQ</button>
          </div>
          <div>
            <h3>Company</h3>
            <button onClick={() => navigatePublic("about")}>About</button>
            <button onClick={() => navigatePublic("partners")}>Partners</button>
            <button onClick={() => navigatePublic("careers")}>Careers</button>
            <button onClick={() => navigatePublic("press")}>Press</button>
            <button onClick={() => navigatePublic("media-kit")}>Media kit</button>
          </div>
          <div>
            <h3>Contact</h3>
            <span>New Delhi, India</span>
            <a href="mailto:info@balancingcarbon.com">info@balancingcarbon.com</a>
            <button onClick={() => navigatePublic("contact")}>Book consultation</button>
          </div>
        </div>
        <div className="bc-shell v1-footer-bottom ep-footer-bottom"><p>&copy; 2026 Balancing Carbon. All rights reserved.</p><div><button onClick={() => navigatePublic("privacy")}>Privacy</button><button onClick={() => navigatePublic("terms")}>Terms</button><button onClick={() => navigatePublic("cookies")}>Cookies</button></div></div>
        <div className="bc-shell v1-footer-bottom"><p>© 2026 Balancing Carbon. All rights reserved.</p><div><span>Privacy Policy</span><span>Terms & Conditions</span></div></div>
      </footer>
      <footer className="hidden bc-site-footer bg-brand-charcoal text-white border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-gray-400">
          <div className="space-y-3">
            <AsymmetricInfinityLogo size="sm" variant="dark" />
            <p className="text-[11px] leading-relaxed">
              Industrial ESG readiness, verified environmental folders, and
              deterministic carbon calculations for Indian manufacturing
              exporters.
            </p>
          </div>

          <div className="space-y-2">
            <strong className="text-white font-mono uppercase tracking-wide block">
              Platform Capabilities
            </strong>
            <button
              onClick={() => setCurrentView("services")}
              className="block hover:text-white hover:underline"
            >
              Carbon Engine
            </button>
            <button
              onClick={() => setCurrentView("services")}
              className="block hover:text-white hover:underline"
            >
              OEM Audits
            </button>
            <button
              onClick={() => setCurrentView("services")}
              className="block hover:text-white hover:underline"
            >
              Evidence Vault
            </button>
          </div>

          <div className="space-y-2">
            <strong className="text-white font-mono uppercase tracking-wide block">
              Filing Frameworks
            </strong>
            <span className="block">SEBI BRSR Core India</span>
            <span className="block">EU CBAM Declarations</span>
            <span className="block">ISO 14001 Evidence</span>
          </div>

          <div className="space-y-2">
            <strong className="text-white font-mono uppercase tracking-wide block">
              Company
            </strong>
            <span className="block font-mono text-[10px]">
              Private, multi-tenant workspaces
            </span>
            <button onClick={() => setCurrentView("about")} className="block hover:text-white hover:underline">About Balancing Carbon</button>
            <span className="block">© 2026 Balancing Carbon Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
