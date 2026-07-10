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
  Printer,
  Download,
  Save,
  Calculator,
  FileCheck,
  FolderClosed,
  Database,
  Info,
} from "lucide-react";

// Brand & Modular Components
import AsymmetricInfinityLogo from "./components/AsymmetricInfinityLogo.tsx";
import AssessmentForm from "./components/AssessmentForm.tsx";
import DashboardSidebar from "./components/DashboardSidebar.tsx";
import DashboardOverview from "./components/DashboardOverview.tsx";
import FacilityManagement from "./components/FacilityManagement.tsx";
import EnergyTracking from "./components/EnergyTracking.tsx";
import CarbonEngineUI from "./components/CarbonEngineUI.tsx";
import ESGAssessmentModule from "./components/ESGAssessmentModule.tsx";
import OEMQuestionnaireModule from "./components/OEMQuestionnaireModule.tsx";
import DocumentCentre from "./components/DocumentCentre.tsx";
import AIAssistantModule from "./components/AIAssistantModule.tsx";
import { getAuthenticatedHeaders, parseJsonResponse, safeFetchJson } from "./services/apiClient.ts";

const PublicCarbonCalculator = lazy(() => import("./components/PublicCarbonCalculator.tsx"));
const ServiceFirstFlow = lazy(() => import("./components/ServiceFirstFlow.tsx"));
const SectorServicesFlow = lazy(() => import("./components/SectorServicesFlow.tsx"));
const CarbonIntelligenceHub = lazy(() => import("./components/CarbonIntelligenceHub.tsx"));

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

export default function App() {
  // Navigation & User session states
  const [currentView, setCurrentView] = useState<ViewState>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupOrgName, setSignupOrgName] = useState("");
  const [signupError, setSignupError] = useState("");

  // Core business models synced from backend
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
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
      const newDoc = await safeFetchJson("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createdDocument = unwrapEntity<Document>(newDoc, ["document"]);
      if (createdDocument?.id)
        setDocuments((prev) => [createdDocument, ...prev]);
    } catch (err) {
      console.error(err);
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
      }
    } catch (err) {
      console.error(err);
    }
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
        const errData = await res
          .json()
          .catch(() => ({ error: "Failed to authenticate session." }));
        setLoginError(
          errData.error || "Invalid corporate email or secure password.",
        );
        return;
      }

      const session = await res.json();
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

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          organisationName: signupOrgName,
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 font-mono mb-1">
                  Company Registered Name
                </label>
                <input
                  type="text"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-medium text-brand-charcoal"
                  value={organisation.name}
                  onChange={(e) =>
                    handleUpdateOrg({ ...organisation, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-gray-400 font-mono mb-1">
                  Employee Count
                </label>
                <input
                  type="number"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal"
                  value={organisation.employeeCount}
                  onChange={(e) =>
                    handleUpdateOrg({
                      ...organisation,
                      employeeCount: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 font-mono mb-1">
                  HQ Corporate Office Address
                </label>
                <input
                  type="text"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite text-brand-charcoal"
                  value={organisation.location}
                  onChange={(e) =>
                    handleUpdateOrg({
                      ...organisation,
                      location: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-gray-400 font-mono mb-1">
                  Primary Industrial Classification
                </label>
                <input
                  type="text"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite text-brand-charcoal"
                  value={organisation.industry}
                  onChange={(e) =>
                    handleUpdateOrg({
                      ...organisation,
                      industry: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-brand-border/50 pt-4">
              <div>
                <label className="block text-gray-400 font-mono mb-1">
                  Net Carbon Target reduction
                </label>
                <input
                  type="number"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal"
                  value={organisation.targetReductionPercent}
                  onChange={(e) =>
                    handleUpdateOrg({
                      ...organisation,
                      targetReductionPercent: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-gray-400 font-mono mb-1">
                  Active Reporting Cycle
                </label>
                <input
                  type="text"
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal"
                  value={organisation.reportingYear}
                  onChange={(e) =>
                    handleUpdateOrg({
                      ...organisation,
                      reportingYear: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-gray-400 font-mono mb-1">
                  Organisation ID
                </label>
                <input
                  type="text"
                  readOnly
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal"
                  value={organisation.id}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() =>
                  alert(
                    "Corporate Profile configurations committed inside secure tenant folder.",
                  )
                }
                className="bg-brand-forest hover:bg-brand-green-sec text-white px-5 py-2 rounded font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Commit Entity Metadata
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

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => window.print()}
                      className="p-2 bg-white hover:bg-gray-50 text-gray-600 rounded border border-brand-border"
                      title="Print hardcopy sheet"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        alert(
                          `Downloading audit sheet package for: ${rep.title}`,
                        )
                      }
                      className="p-2 bg-white hover:bg-gray-50 text-brand-forest rounded border border-brand-border"
                      title="Download PDF package"
                    >
                      <Download className="w-3.5 h-3.5" />
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

  // Render Client Dashboard Container
  if (authenticated) {
    return (
      <div
        className="flex h-screen bg-brand-offwhite overflow-hidden text-brand-charcoal font-sans"
        id="client-dashboard-app"
      >
        {/* Navigation Sidebar */}
        <DashboardSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout}
          user={currentUser}
        />

        {/* Action center workspace viewport */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Action Bar / Status Topbar */}
          <header className="bg-white border-b border-brand-border/60 h-16 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono uppercase bg-brand-sage text-brand-forest px-2.5 py-1 rounded-lg font-bold tracking-wider">
                Industrial Active Context
              </span>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                User Scope: ESG Director • Server Ping Active (0.0.0.0:3000)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView("dashboard-ai-assistant")}
                className="bg-brand-forest hover:bg-brand-green-sec text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer animate-pulse"
              >
                Ask Carbon AI
              </button>
            </div>
          </header>

          {/* Subview Viewport */}
          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-gray-400 flex-col gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-brand-forest" />
                <span>Loading secure multi-tenant factory logs...</span>
              </div>
            ) : (
              <>
                {currentView === "dashboard-overview" && (
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
                  />
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
                  <Suspense fallback={<DashboardModuleLoader label="Loading calculator..." />}>
                    <PublicCarbonCalculator
                      onRegister={() => setCurrentView("dashboard-energy")}
                      ctaTitle="Move Estimate Into Activity Ledger"
                      ctaDescription="Use this sandbox for quick modelling, then enter real electricity, fuel, production, evidence, and factor-backed records in the Energy Ledger so dashboard totals remain traceable."
                      ctaButtonLabel="Open Energy Ledger"
                    />
                  </Suspense>
                )}

                {/* Carbon engine explorer views */}
                {currentView === "dashboard-emissions-scope1" && (
                  <CarbonEngineUI
                    scopeType="scope-1"
                    facilities={facilities}
                    records={records}
                  />
                )}
                {currentView === "dashboard-emissions-scope2" && (
                  <CarbonEngineUI
                    scopeType="scope-2"
                    facilities={facilities}
                    records={records}
                  />
                )}
                {currentView === "dashboard-emissions-scope3" && (
                  <CarbonEngineUI
                    scopeType="scope-3"
                    facilities={facilities}
                    records={records}
                  />
                )}
                {currentView === "dashboard-intelligence" && (
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
                )}

                {/* ESG & Surveys */}
                {currentView === "dashboard-esg" && (
                  <ESGAssessmentModule
                    questions={esgQuestions}
                    onUpdateQuestion={handleUpdateQuestion}
                    documents={documents}
                  />
                )}
                {currentView === "dashboard-questionnaires" && (
                  <OEMQuestionnaireModule
                    surveys={oemSurveys}
                    onAddSurvey={handleAddSurvey}
                    onApproveQuestion={handleApproveOEMQuestion}
                  />
                )}

                {/* Documents & Reports */}
                {currentView === "dashboard-documents" && (
                  <DocumentCentre
                    documents={documents}
                    onAddDocument={handleAddDocument}
                    onDeleteDocument={handleDeleteDocument}
                  />
                )}
                {currentView === "dashboard-reports" && renderReportsCentre()}

                {/* Company profile entity updates */}
                {currentView === "dashboard-company" && renderCompanyProfile()}
                {currentView === "dashboard-settings" && renderCompanyProfile()}

                {/* Smart Chatbot */}
                {currentView === "dashboard-ai-assistant" && (
                  <AIAssistantModule />
                )}
              </>
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
      {/* Public Header bar with Asymmetric logo */}
      <header className="bg-white border-b border-brand-border/60 min-h-24 flex items-center sticky top-0 z-[100] px-6 py-3">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <button
            onClick={() => setCurrentView("home")}
            className="cursor-pointer"
          >
            <AsymmetricInfinityLogo size="lg" />
          </button>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-xs font-bold font-mono tracking-wide text-brand-charcoal">
            <button
              onClick={() => setCurrentView("industries")}
              className={`hover:text-brand-forest transition-colors cursor-pointer flex items-center gap-1.5 ${currentView === "industries" ? "text-brand-forest" : "text-gray-500"}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Services (Sector-First)
            </button>
            <button
              onClick={() => setCurrentView("public-calculator")}
              className={`hover:text-brand-forest transition-colors cursor-pointer flex items-center gap-1.5 ${currentView === "public-calculator" ? "text-brand-forest" : "text-gray-500"}`}
            >
              <FileText className="w-3.5 h-3.5" /> Resources
            </button>
            <button
              onClick={() => setCurrentView("services")}
              className={`px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                currentView === "services"
                  ? "bg-brand-charcoal text-white"
                  : "bg-brand-charcoal text-white hover:bg-black"
              }`}
            >
              <Database className="w-3.5 h-3.5 text-brand-sage" /> All Services
              (Service-First)
            </button>
            <button
              onClick={() => setCurrentView("about")}
              className={`hover:text-brand-forest transition-colors cursor-pointer flex items-center gap-1.5 ${currentView === "about" ? "text-brand-forest" : "text-gray-500"}`}
            >
              <Info className="w-3.5 h-3.5" /> About Us
            </button>
          </nav>

          {/* Action Login triggers */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            <button
              onClick={() => {
                setIsSignUpMode(false);
                setCurrentView("login");
              }}
              className="text-xs font-mono font-bold text-gray-500 hover:text-brand-forest px-3 py-2 rounded-lg border border-transparent hover:border-brand-border transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              onClick={() => {
                setIsSignUpMode(true);
                setCurrentView("login");
              }}
              className="text-xs font-mono font-bold text-brand-forest hover:text-white px-3 py-2 rounded-lg border border-brand-forest/30 hover:bg-brand-forest transition-all flex items-center gap-1.5"
            >
              <Building className="w-3.5 h-3.5" /> Register
            </button>
          </div>

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-brand-charcoal hover:text-brand-forest"
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
        <div className="lg:hidden bg-white border-b border-brand-border/60 py-4 px-6 space-y-3 font-mono font-bold text-xs">
          <button
            onClick={() => {
              setCurrentView("industries");
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest"
          >
            Services (Sector-First)
          </button>
          <button
            onClick={() => {
              setCurrentView("public-calculator");
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest"
          >
            Resources & Calculator
          </button>
          <button
            onClick={() => {
              setCurrentView("services");
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-brand-forest hover:text-brand-green-sec flex items-center gap-1.5 font-extrabold"
          >
            <Database className="w-4 h-4" /> All Services (Service-First)
          </button>
          <button
            onClick={() => {
              setCurrentView("about");
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest"
          >
            About Us
          </button>
          <div className="border-t border-brand-border/40 pt-3 flex flex-col gap-2">
            <button
              onClick={() => {
                setIsSignUpMode(false);
                setCurrentView("login");
                setMobileMenuOpen(false);
              }}
              className="w-full text-center py-2 text-brand-charcoal border border-brand-border rounded"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsSignUpMode(true);
                setCurrentView("login");
                setMobileMenuOpen(false);
              }}
              className="w-full text-center py-2 bg-brand-forest text-white rounded font-bold"
            >
              Register Company
            </button>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="flex-grow">
        {/* View: Public Homepage */}
        {currentView === "home" && (
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
                setCurrentView("login");
              }}
            />
          </Suspense>
        )}

        {/* View: Services Portfolio */}
        {currentView === "services" && (
          <Suspense fallback={<DashboardModuleLoader label="Loading services..." />}>
            <ServiceFirstFlow />
          </Suspense>
        )}

        {/* View: Sector-First Services */}
        {currentView === "industries" && (
          <Suspense fallback={<DashboardModuleLoader label="Loading sector services..." />}>
            <SectorServicesFlow />
          </Suspense>
        )}
        {/* View: Free Interactive ESG Assessment form */}
        {currentView === "assessment" && (
          <div className="max-w-5xl mx-auto px-6 py-16">
            <AssessmentForm
              onLoginRequest={() => {
                setIsSignUpMode(false);
                setCurrentView("login");
              }}
            />
          </div>
        )}

        {/* View: Founding Vision / Our Vision */}
        {currentView === "about" && (
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
          <div className="max-w-md mx-auto px-6 py-16">
            <div className="bg-white border border-brand-border rounded-xl shadow-lg p-6 space-y-6">
              <div className="text-center space-y-1">
                <AsymmetricInfinityLogo size="md" className="mx-auto" />
                <h2 className="text-lg font-bold text-brand-charcoal font-mono uppercase tracking-wider pt-2">
                  {isSignUpMode
                    ? "Register Corporate Account"
                    : "Client Login Portal"}
                </h2>
                <p className="text-[11px] text-gray-400 font-mono">
                  {isSignUpMode
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

              {!isSignUpMode ? (
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
      <footer className="bg-brand-charcoal text-white border-t border-white/5 py-10 px-6">
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
              Secure Tenancy
            </strong>
            <span className="block font-mono text-[10px]">
              CLAIM: multi-tenant-isolated
            </span>
            <span className="block">Active Port: 3000 (Cloud Run)</span>
            <span className="block">© 2026 Balancing Carbon Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
