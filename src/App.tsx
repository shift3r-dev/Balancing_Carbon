import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ArrowRight, Lock, Building2, ExternalLink, Factory, 
  ChevronRight, Flame, Zap, Award, FileText, CheckCircle2, Menu, X, 
  Building, BookOpen, AlertTriangle, RefreshCw, Printer, Download, Save,
  Calculator, FileCheck, FolderClosed
} from 'lucide-react';

// Brand & Modular Components
import AsymmetricInfinityLogo from './components/AsymmetricInfinityLogo.tsx';
import AssessmentForm from './components/AssessmentForm.tsx';
import DashboardSidebar from './components/DashboardSidebar.tsx';
import DashboardOverview from './components/DashboardOverview.tsx';
import FacilityManagement from './components/FacilityManagement.tsx';
import EnergyTracking from './components/EnergyTracking.tsx';
import CarbonEngineUI from './components/CarbonEngineUI.tsx';
import ESGAssessmentModule from './components/ESGAssessmentModule.tsx';
import OEMQuestionnaireModule from './components/OEMQuestionnaireModule.tsx';
import DocumentCentre from './components/DocumentCentre.tsx';
import AIAssistantModule from './components/AIAssistantModule.tsx';

// Shared interfaces
import { Facility, EnergyRecord, ESGQuestion, OEMQuestionnaire, Document, Organisation, ViewState } from './types.ts';

export default function App() {
  // Navigation & User session states
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('balancing_carbon_session') !== null;
  });
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('balancing_carbon_session');
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
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupOrgName, setSignupOrgName] = useState('');
  const [signupError, setSignupError] = useState('');

  // Core business models synced from backend
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [records, setRecords] = useState<EnergyRecord[]>([]);
  const [esgQuestions, setEsgQuestions] = useState<ESGQuestion[]>([]);
  const [oemSurveys, setOemSurveys] = useState<OEMQuestionnaire[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeScopeType, setHomeScopeType] = useState<'scope-1' | 'scope-2' | 'scope-3'>('scope-1');
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState('BRSR Core Audit Report');
  const [reportPeriod, setReportPeriod] = useState('FY 2025-26');
  const [reportSummary, setReportSummary] = useState('');


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
          '/api/organisation',
          '/api/facilities',
          '/api/energy',
          '/api/esg',
          '/api/oem-surveys',
          '/api/documents',
          '/api/reports'
        ];

        const savedSession = localStorage.getItem('balancing_carbon_session');
        const session = savedSession ? JSON.parse(savedSession) : null;
        const token = session?.token ?? session?.accessToken;
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const responses = await Promise.all(endpoints.map(url => fetch(url, { headers })));

        const safeJson = async (res: Response, fallback: any) => {
          if (!res.ok) {
            console.error(`Fetch failed for ${res.url} with status ${res.status}`);
            return fallback;
          }
          try {
            const text = await res.text();
            if (!text || text.trim() === '' || text.trim() === 'undefined') {
              return fallback;
            }
            return JSON.parse(text);
          } catch (e) {
            console.error(`Error parsing JSON for ${res.url}:`, e);
            return fallback;
          }
        };

        const orgData = await safeJson(responses[0], null);
        const facData = await safeJson(responses[1], []);
        const energyData = await safeJson(responses[2], []);
        const esgData = await safeJson(responses[3], []);
        const oemData = await safeJson(responses[4], []);
        const docData = await safeJson(responses[5], []);
        const repData = await safeJson(responses[6], []);

        setOrganisation(orgData);
        setFacilities(Array.isArray(facData) ? facData : (facData?.facilities ?? []));
        setRecords(Array.isArray(energyData) ? energyData : (energyData?.records ?? []));
        setEsgQuestions(Array.isArray(esgData) ? esgData : (esgData?.questions ?? []));
        setOemSurveys(Array.isArray(oemData) ? oemData : (oemData?.surveys ?? []));
        setDocuments(Array.isArray(docData) ? docData : (docData?.documents ?? []));
        setReports(Array.isArray(repData) ? repData : (repData?.reports ?? []));
      } catch (err) {
        console.error('Error fetching seeded multi-tenant states:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, [authenticated, currentUser]);

  // Safe fetch helper for inline mutations
  const safeFetchJson = async (url: string, options?: RequestInit, fallback: any = null) => {
    try {
      const headers = {
        ...(options?.headers || {}),
        'Content-Type': 'application/json',
      } as Record<string, string>;

      const savedSession = localStorage.getItem('balancing_carbon_session');
      const session = savedSession ? JSON.parse(savedSession) : null;
      const token = session?.token ?? session?.accessToken;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        console.error(`Request failed for ${url}: status ${res.status}`);
        return fallback;
      }
      const text = await res.text();
      if (!text || text.trim() === '' || text.trim() === 'undefined') {
        return fallback;
      }
      return JSON.parse(text);
    } catch (err) {
      console.error(`Error in safeFetchJson for ${url}:`, err);
      return fallback;
    }
  };

  const unwrapEntity = <T,>(response: any, keys: string[]): T | null => {
    if (!response) return null;
    for (const key of keys) {
      if (response[key] && typeof response[key] === 'object') return response[key] as T;
    }
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) return response.data as T;
    return response as T;
  };

  // Sync state helpers
  const handleAddFacility = async (payload: any) => {
    try {
      const newFac = await safeFetchJson('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const createdFacility = unwrapEntity<Facility>(newFac, ['facility']);
      if (createdFacility?.id) setFacilities(prev => [...prev, createdFacility]);
      
      // reload lists to reflect computed emissions & scores
      const freshFacs = await safeFetchJson('/api/facilities', undefined, []);
      setFacilities(Array.isArray(freshFacs) ? freshFacs : (freshFacs?.facilities ?? []));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFacility = async (id: string, payload: any) => {
    try {
      const updated = await safeFetchJson(`/api/facilities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const updatedFacility = unwrapEntity<Facility>(updated, ['facility']);
      if (updatedFacility?.id) setFacilities(prev => prev.map(f => f.id === id ? updatedFacility : f));
      
      // reload list to capture recalculations
      const freshFacs = await safeFetchJson('/api/facilities', undefined, []);
      setFacilities(Array.isArray(freshFacs) ? freshFacs : (freshFacs?.facilities ?? []));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    try {
      const deleted = await safeFetchJson(`/api/facilities/${id}`, { method: 'DELETE' }, { success: true });
      if (!deleted) return;
      setFacilities(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRecord = async (payload: any) => {
    try {
      const newRec = await safeFetchJson('/api/energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const createdRecord = unwrapEntity<EnergyRecord>(newRec, ['record', 'energyRecord']);
      if (createdRecord?.id) setRecords(prev => [createdRecord, ...prev]);

      // Trigger recalculation reload across facilities
      const facData = await safeFetchJson('/api/facilities', undefined, []);
      const energyData = await safeFetchJson('/api/energy', undefined, []);
      setFacilities(Array.isArray(facData) ? facData : (facData?.facilities ?? []));
      setRecords(Array.isArray(energyData) ? energyData : (energyData?.records ?? []));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateQuestion = async (id: string, payload: any) => {
    try {
      const updated = await safeFetchJson(`/api/esg/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (updated) {
        setEsgQuestions(prev => prev.map(q => q.id === id ? updated : q));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSurvey = async (title: string, oemName: string, dueDate: string) => {
    try {
      const newSurvey = await safeFetchJson('/api/oem-surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, oemName, dueDate })
      });
      const createdSurvey = unwrapEntity<OEMQuestionnaire>(newSurvey, ['survey', 'questionnaire']);
      if (createdSurvey?.id) setOemSurveys(prev => [...prev, createdSurvey]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveOEMQuestion = async (surveyId: string, questionId: string, status: any, suggestedAnswer?: string) => {
    try {
      await safeFetchJson(`/api/oem-surveys/${surveyId}/approve-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, status, suggestedAnswer })
      });

      // Reload questionnaires to preserve deep updates
      const freshSurveys = await safeFetchJson('/api/oem-surveys', undefined, []);
      setOemSurveys(Array.isArray(freshSurveys) ? freshSurveys : (freshSurveys?.surveys ?? []));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDocument = async (payload: any) => {
    try {
      const newDoc = await safeFetchJson('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const createdDocument = unwrapEntity<Document>(newDoc, ['document']);
      if (createdDocument?.id) setDocuments(prev => [createdDocument, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const deleted = await safeFetchJson(`/api/documents/${id}`, { method: 'DELETE' }, { success: true });
      if (!deleted) return;
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrg = async (updatedOrgPayload: any) => {
    try {
      const updated = await safeFetchJson('/api/organisation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrgPayload)
      });
      if (updated) {
        setOrganisation(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReport = async (title: string, type: string, period: string, summary: string) => {
    try {
      const report = await safeFetchJson('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, period, summary })
      });
      const createdReport = unwrapEntity<any>(report, ['report']);
      if (createdReport?.id) setReports(prev => [createdReport, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  // Real Log In Handler
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('All fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to authenticate session.' }));
        setLoginError(errData.error || 'Invalid corporate email or secure password.');
        return;
      }

      const session = await res.json();
      localStorage.setItem('balancing_carbon_session', JSON.stringify(session));
      setCurrentUser(session.user);
      setOrganisation(session.organisation);
      setAuthenticated(true);
      setCurrentView('dashboard-overview');
    } catch (err) {
      console.error(err);
      setLoginError('Server connection error. Please try again.');
    }
  };

  // Real Sign Up Handler
  const handleFormSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    if (!signupName || !signupEmail || !signupPassword || !signupOrgName) {
      setSignupError('All fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          organisationName: signupOrgName
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to register account.' }));
        setSignupError(errData.error || 'Failed to register account.');
        return;
      }

      const session = await res.json();
      localStorage.setItem('balancing_carbon_session', JSON.stringify(session));
      setCurrentUser(session.user);
      setOrganisation(session.organisation);
      setAuthenticated(true);
      setCurrentView('dashboard-overview');
      // Reset signup fields
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupOrgName('');
    } catch (err) {
      console.error(err);
      setSignupError('Server connection error. Please try again.');
    }
  };

  // Log out
  const handleLogout = () => {
    localStorage.removeItem('balancing_carbon_session');
    setAuthenticated(false);
    setCurrentUser(null);
    setOrganisation(null);
    setFacilities([]);
    setRecords([]);
    setEsgQuestions([]);
    setOemSurveys([]);
    setDocuments([]);
    setReports([]);
    setCurrentView('home');
  };

  // Custom Company Profile Subview inside Dashboard
  const renderCompanyProfile = () => {
    if (!organisation) {
      return (
        <div className="bg-white p-6 rounded-xl border border-brand-border text-sm text-gray-500">
          Organisation profile could not be loaded. Please refresh or sign in again.
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl border border-brand-border">
          <h1 className="text-xl font-extrabold text-brand-charcoal">Corporate Profile</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">Configure organization entities, industrial licenses, and carbon targets.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-brand-border rounded-xl p-5 lg:col-span-2 space-y-4 text-xs">
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal">Entity Metadata</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 font-mono mb-1">Company Registered Name</label>
                <input 
                  type="text" 
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-medium text-brand-charcoal" 
                  value={organisation.name}
                  onChange={(e) => handleUpdateOrg({ ...organisation, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-400 font-mono mb-1">Registration Identifier (CIN)</label>
                <input 
                  type="text" 
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal" 
                  value={organisation.registrationNumber}
                  onChange={(e) => handleUpdateOrg({ ...organisation, registrationNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 font-mono mb-1">HQ Corporate Office Address</label>
                <input 
                  type="text" 
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite text-brand-charcoal" 
                  value={organisation.hqAddress}
                  onChange={(e) => handleUpdateOrg({ ...organisation, hqAddress: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-400 font-mono mb-1">Primary Industrial Classification</label>
                <input 
                  type="text" 
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite text-brand-charcoal" 
                  value={organisation.sector}
                  onChange={(e) => handleUpdateOrg({ ...organisation, sector: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-brand-border/50 pt-4">
              <div>
                <label className="block text-gray-400 font-mono mb-1">Net Carbon Target reduction</label>
                <input 
                  type="text" 
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal" 
                  value={organisation.targetReduction}
                  onChange={(e) => handleUpdateOrg({ ...organisation, targetReduction: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-400 font-mono mb-1">Target Milestone Year</label>
                <input 
                  type="text" 
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal" 
                  value={organisation.targetYear}
                  onChange={(e) => handleUpdateOrg({ ...organisation, targetYear: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-400 font-mono mb-1">Active Reporting Cycle</label>
                <input 
                  type="text" 
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono text-brand-charcoal" 
                  value={organisation.reportingPeriod}
                  onChange={(e) => handleUpdateOrg({ ...organisation, reportingPeriod: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="button"
                onClick={() => alert('Corporate Profile configurations committed inside secure tenant folder.')}
                className="bg-brand-forest hover:bg-brand-green-sec text-white px-5 py-2 rounded font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Commit Entity Metadata
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-brand-charcoal text-white p-5 rounded-xl border border-white/5 space-y-4">
              <h4 className="text-xs font-bold font-mono text-brand-sage uppercase tracking-wider">Multi-Tenant Tenant ID</h4>
              <p className="text-xs text-gray-400 leading-normal font-mono">
                CLAIM: org-apex-precision-prod-001
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">
                This client context maintains a unique encryption seed isolating precision forging machinery limits and pollution board filings from sibling suppliers on the Balancing Carbon cloud infrastructure.
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
      setReportTitle('');
      setReportSummary('');
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl border border-brand-border">
          <h1 className="text-xl font-extrabold text-brand-charcoal">Reports Centre</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">Generate exportable audit worksheets, BRSR Core submissions, and OEM ESG files.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal">Compile Audit Report</h3>
            
            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-gray-500 font-mono mb-1">Report Sheet Title *</label>
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
                <label className="block text-gray-500 font-mono mb-1">Filing/Audit standard *</label>
                <select 
                  className="w-full border border-brand-border p-2.5 rounded bg-white text-xs"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="BRSR Core Audit Report">BRSR Core Audit Report (SEBI India)</option>
                  <option value="ISO 14064 GHG Statement">ISO 14064 GHG Statement</option>
                  <option value="OEM Supplier Compliance Deck">OEM Supplier Compliance Deck</option>
                  <option value="Scope 2 Electricity Offsetting Summary">Scope 2 Electricity Offsetting Summary</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-mono mb-1">Filing Cycle *</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-brand-border p-2.5 rounded bg-brand-offwhite font-mono"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-gray-500 font-mono mb-1">Scope Executive Summary Notes</label>
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
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-brand-charcoal">Generated Audit Packages ({reports.length})</h3>

            <div className="space-y-3">
              {reports.map((rep: any) => (
                <div key={rep.id} className="p-4 bg-brand-offwhite rounded-xl border border-brand-border/60 flex justify-between items-center gap-4 hover:shadow-sm transition-all">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-brand-charcoal font-mono text-xs">{rep.title}</h4>
                    <p className="text-gray-500 text-[11px] mt-1 leading-snug">{rep.summary || 'Compiled automatically from electricity invoices and diesel ledger bills.'}</p>
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
                      onClick={() => alert(`Downloading audit sheet package for: ${rep.title}`)}
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
      <div className="flex h-screen bg-brand-offwhite overflow-hidden text-brand-charcoal font-sans" id="client-dashboard-app">
        {/* Navigation Sidebar */}
        <DashboardSidebar 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          onLogout={handleLogout} 
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
                onClick={() => setCurrentView('dashboard-ai-assistant')}
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
                {currentView === 'dashboard-overview' && (
                  <DashboardOverview 
                    facilities={facilities} 
                    records={records} 
                    esgQuestions={esgQuestions} 
                    oemSurveys={oemSurveys} 
                    documents={documents}
                    onNavigate={setCurrentView} 
                  />
                )}
                {currentView === 'dashboard-facilities' && (
                  <FacilityManagement 
                    facilities={facilities} 
                    onAddFacility={handleAddFacility} 
                    onUpdateFacility={handleUpdateFacility} 
                    onDeleteFacility={handleDeleteFacility} 
                  />
                )}
                {currentView === 'dashboard-energy' && (
                  <EnergyTracking 
                    records={records} 
                    facilities={facilities} 
                    onAddRecord={handleAddRecord} 
                  />
                )}
                
                {/* Carbon engine explorer views */}
                {currentView === 'dashboard-emissions-scope1' && (
                  <CarbonEngineUI scopeType="scope-1" facilities={facilities} />
                )}
                {currentView === 'dashboard-emissions-scope2' && (
                  <CarbonEngineUI scopeType="scope-2" facilities={facilities} />
                )}
                {currentView === 'dashboard-emissions-scope3' && (
                  <CarbonEngineUI scopeType="scope-3" facilities={facilities} />
                )}

                {/* ESG & Surveys */}
                {currentView === 'dashboard-esg' && (
                  <ESGAssessmentModule 
                    questions={esgQuestions} 
                    onUpdateQuestion={handleUpdateQuestion} 
                    documents={documents} 
                  />
                )}
                {currentView === 'dashboard-questionnaires' && (
                  <OEMQuestionnaireModule 
                    surveys={oemSurveys} 
                    onAddSurvey={handleAddSurvey} 
                    onApproveQuestion={handleApproveOEMQuestion} 
                  />
                )}
                
                {/* Documents & Reports */}
                {currentView === 'dashboard-documents' && (
                  <DocumentCentre 
                    documents={documents} 
                    onAddDocument={handleAddDocument} 
                    onDeleteDocument={handleDeleteDocument} 
                  />
                )}
                {currentView === 'dashboard-reports' && renderReportsCentre()}
                
                {/* Company profile entity updates */}
                {currentView === 'dashboard-company' && renderCompanyProfile()}
                {currentView === 'dashboard-settings' && renderCompanyProfile()}

                {/* Smart Chatbot */}
                {currentView === 'dashboard-ai-assistant' && <AIAssistantModule />}
              </>
            )}
          </main>
        </div>

      </div>
    );
  }

  // Render Public Website Router
  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-charcoal font-sans flex flex-col justify-between" id="public-website">
      
      {/* Public Header bar with Asymmetric logo */}
      <header className="bg-white border-b border-brand-border/60 h-20 flex items-center sticky top-0 z-[100] px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <button onClick={() => setCurrentView('home')} className="cursor-pointer">
            <AsymmetricInfinityLogo size="lg" />
          </button>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold font-mono tracking-wide text-brand-charcoal">
            <button 
              onClick={() => setCurrentView('home')} 
              className={`hover:text-brand-forest transition-colors cursor-pointer ${currentView === 'home' ? 'text-brand-forest border-b-2 border-brand-forest pb-1' : ''}`}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentView('services')} 
              className={`hover:text-brand-forest transition-colors cursor-pointer ${currentView === 'services' ? 'text-brand-forest border-b-2 border-brand-forest pb-1' : ''}`}
            >
              Services
            </button>
            <button 
              onClick={() => setCurrentView('industries')} 
              className={`hover:text-brand-forest transition-colors cursor-pointer ${currentView === 'industries' ? 'text-brand-forest border-b-2 border-brand-forest pb-1' : ''}`}
            >
              Industries
            </button>
            <button 
              onClick={() => setCurrentView('public-calculator')} 
              className={`hover:text-brand-forest transition-colors cursor-pointer text-brand-forest flex items-center gap-1 font-extrabold ${currentView === 'public-calculator' ? 'border-b-2 border-brand-forest pb-1' : ''}`}
            >
              <Calculator className="w-3.5 h-3.5" /> Carbon Calculator
            </button>
            <button 
              onClick={() => setCurrentView('assessment')} 
              className={`hover:text-brand-forest transition-colors cursor-pointer ${currentView === 'assessment' ? 'text-brand-forest border-b-2 border-brand-forest pb-1' : ''}`}
            >
              Free Assessment
            </button>
            <button 
              onClick={() => setCurrentView('about')} 
              className={`hover:text-brand-forest transition-colors cursor-pointer ${currentView === 'about' ? 'text-brand-forest border-b-2 border-brand-forest pb-1' : ''}`}
            >
              Our Vision
            </button>
          </nav>

          {/* Action Login triggers */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => { setIsSignUpMode(false); setCurrentView('login'); }}
              className="text-xs font-mono font-bold hover:text-brand-forest px-4 py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUpMode(true); setCurrentView('login'); }}
              className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              Register Company <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile menu hamburger toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden text-brand-charcoal hover:text-brand-forest"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-brand-border/60 py-4 px-6 space-y-3 font-mono font-bold text-xs">
          <button 
            onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }} 
            className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest"
          >
            Home
          </button>
          <button 
            onClick={() => { setCurrentView('services'); setMobileMenuOpen(false); }} 
            className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest"
          >
            Services
          </button>
          <button 
            onClick={() => { setCurrentView('industries'); setMobileMenuOpen(false); }} 
            className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest"
          >
            Industries
          </button>
          <button 
            onClick={() => { setCurrentView('public-calculator'); setMobileMenuOpen(false); }} 
            className="block w-full text-left py-2 text-brand-forest hover:text-brand-green-sec flex items-center gap-1.5 font-extrabold"
          >
            <Calculator className="w-4 h-4" /> Carbon Calculator
          </button>
          <button 
            onClick={() => { setCurrentView('assessment'); setMobileMenuOpen(false); }} 
            className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest"
          >
            Free Assessment
          </button>
          <button 
            onClick={() => { setCurrentView('about'); setMobileMenuOpen(false); }} 
            className="block w-full text-left py-2 text-gray-600 hover:text-brand-forest"
          >
            Our Vision
          </button>
          <div className="border-t border-brand-border/40 pt-3 flex flex-col gap-2">
            <button 
              onClick={() => { setIsSignUpMode(false); setCurrentView('login'); setMobileMenuOpen(false); }} 
              className="w-full text-center py-2 text-gray-600 border border-brand-border rounded"
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsSignUpMode(true); setCurrentView('login'); setMobileMenuOpen(false); }} 
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
        {currentView === 'home' && (
          <div className="space-y-24 pb-24">
            
            {/* HERO SECTION */}
            <section className="bg-white border-b border-brand-border/40 py-20 px-6">
              <div className="max-w-5xl mx-auto text-center space-y-6">
                
                {/* Small notification badge */}
                <div className="inline-flex items-center gap-1.5 bg-brand-sage/40 text-brand-forest border border-brand-border px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mx-auto">
                  <ShieldCheck className="w-3.5 h-3.5" /> Made for Indian Manufacturers, Exporters, and MSMEs
                </div>

                <h1 className="text-4xl sm:text-5xl font-black text-brand-charcoal tracking-tight max-w-4xl mx-auto leading-[1.1]">
                  Industrial Carbon Intelligence & <span className="text-brand-forest">ESG Readiness</span> Built for Indian Exporters
                </h1>

                <p className="text-sm text-gray-500 max-w-3xl mx-auto leading-relaxed">
                  Avoid compliance bottlenecks, calculate deterministic Scope 1 & Scope 2 footprints with IPCC/CEA factors, auto-generate verified answers for OEM supplier audits, and navigate CBAM export regulations securely.
                </p>

                {/* Main Conversion CTA button pair */}
                <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => setCurrentView('public-calculator')}
                    className="bg-brand-forest hover:bg-brand-green-sec text-white px-6 py-3.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer animate-pulse"
                  >
                    <Calculator className="w-4 h-4" /> Try Instant Carbon Calculator
                  </button>
                  <button
                    onClick={() => setCurrentView('assessment')}
                    className="bg-brand-charcoal hover:bg-black text-white px-6 py-3.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    Start Free ESG Assessment <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setIsSignUpMode(false); setCurrentView('login'); }}
                    className="bg-white hover:bg-gray-50 text-brand-charcoal border border-brand-border px-6 py-3.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    Secure Client Portal
                  </button>
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
                    Auto-OEMs like Tata Motors, Mahindra, and Maruti Suzuki, alongside European carbon border taxes (CBAM), now mandate detailed, evidence-backed environmental records. Failing to present structured spreadsheets, carbon calculations, and verified regulatory licenses blocks you from supply chains.
                  </p>

                  <div className="space-y-3.5">
                    <div className="flex gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
                      <div>
                        <strong>No More Spreadsheet Guesswork:</strong> Spreadsheets lack structured calculation logs. Auditing firms (TÜV, SGS) require clear factor trails (CEA Grid version 19).
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
                      <div>
                        <strong>Draft Codes Lacking Signatures:</strong> OEMs flag simple verbal assurances. You need secure physical linkage of vendor policies.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Illustrated stats card */}
                <div className="bg-white border border-brand-border rounded-xl p-8 space-y-6 shadow-inner relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-brand-forest/5 rounded-full blur-2xl pointer-events-none" />
                  <span className="text-[10px] font-mono uppercase text-gray-400">Carbon Border Taxes (CBAM)</span>
                  <div className="text-5xl font-black font-mono tracking-tight text-brand-charcoal">
                    2026
                  </div>
                  <p className="text-xs text-gray-500 leading-normal">
                    Starting 2026, European customs require verified embedded emissions declarations for incoming steel, metal components, chemicals, and industrial shipments.
                  </p>
                  <div className="border-t border-brand-border/60 pt-4 font-mono text-[10px] text-brand-forest flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4" /> Fully mapped to CBAM filing mandates
                  </div>
                </div>
              </div>
            </section>



            {/* SERVICES SOLUTIONS SECTION */}
            <section className="bg-white py-20 border-y border-brand-border/40 px-6">
              <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-mono uppercase text-brand-forest tracking-widest font-bold">Comprehensive Capabilities</span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-brand-charcoal">The Balancing Carbon Technology Stack</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Service 1 */}
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border/80 space-y-4">
                    <div className="p-3 bg-brand-forest/10 rounded-lg text-brand-forest w-fit">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-brand-charcoal font-mono uppercase tracking-wide">Deterministic Carbon Engine</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Zero-deviation carbon accounting for Scope 1 stationary combustions and location-based Scope 2 grids, conforming directly to statutory Indian CEA and IPCC standards.
                    </p>
                  </div>

                  {/* Service 2 */}
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border/80 space-y-4">
                    <div className="p-3 bg-brand-forest/10 rounded-lg text-brand-forest w-fit">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-brand-charcoal font-mono uppercase tracking-wide">OEM Questionnaire Assistance</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Auto-extract audit questions, map secure physical folder proofs, and compile high-confidence drafts utilizing your live regional factory metrics.
                    </p>
                  </div>

                  {/* Service 3 */}
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border/80 space-y-4">
                    <div className="p-3 bg-brand-forest/10 rounded-lg text-brand-forest w-fit">
                      <FolderClosed className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-brand-charcoal font-mono uppercase tracking-wide">Evidence Document Vault</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Protect and isolate your State Pollution board permits, electricity billing invoices, and certified audit sheets in dedicated multi-tenant secure client lockers.
                    </p>
                  </div>

                </div>
              </div>
            </section>

            {/* DYNAMIC DASHBOARD PREVIEW SLIDE */}
            <section className="max-w-7xl mx-auto px-6 space-y-12">
              <div className="text-center space-y-2">
                <span className="text-[10px] font-mono uppercase text-brand-forest tracking-widest font-bold">Interactive Platform Preview</span>
                <h2 className="text-2xl font-extrabold tracking-tight text-brand-charcoal">Pre-populated Tenant: Apex Precision Components</h2>
              </div>

              {/* Fake dashboard mockup illustration */}
              <div className="bg-brand-charcoal rounded-2xl border border-white/5 shadow-2xl overflow-hidden p-6 text-white space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <div className="w-3 h-3 bg-amber-400 rounded-full" />
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                    <span className="text-xs font-mono text-gray-400 ml-2">Apex Precision Components Private Vault Cockpit</span>
                  </div>
                  <span className="text-[10px] font-mono bg-white/10 px-3 py-1 rounded">ID: org-apex</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Scope 1 Direct</span>
                    <div className="text-2xl font-mono font-bold mt-1 text-brand-sage">167.3 t</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Scope 2 Grid</span>
                    <div className="text-2xl font-mono font-bold mt-1 text-brand-sage">851.6 t</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Renewable Share</span>
                    <div className="text-2xl font-mono font-bold mt-1 text-brand-sage">34.5%</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">ESG Score</span>
                    <div className="text-2xl font-mono font-bold mt-1 text-brand-sage">72%</div>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-lg border border-white/5 text-xs flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <AlertTriangle className="w-4 h-4 text-brand-amber animate-pulse" />
                    <span><strong>MPCB Alert:</strong> Pune stamping unit Consent to Operate (CTO) application under review.</span>
                  </div>
                  <button 
                    onClick={() => { setIsSignUpMode(false); setCurrentView('login'); }} 
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
                  <span className="text-[10px] font-mono uppercase text-brand-forest tracking-widest font-bold">Focus Geographies & Industries</span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-brand-charcoal">Supporting India's Manufacturing Backbone</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Our platform is custom-built for high-intensity industrial sectors operating in metalworking hubs like Pune, Ludhiana, Chennai, Mohali, and Faridabad.
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
                    <span className="font-bold text-xs text-brand-charcoal block">Mohali Unit</span>
                    <span className="text-[10px] text-gray-400 font-mono">CNC Machining • Punjab Grid</span>
                  </div>
                  <div className="p-6 bg-brand-offwhite rounded-xl border border-brand-border space-y-2">
                    <Factory className="w-6 h-6 text-brand-forest" />
                    <span className="font-bold text-xs text-brand-charcoal block">Pune Unit</span>
                    <span className="text-[10px] text-gray-400 font-mono">Stamping • Maharashtra Grid</span>
                  </div>
                </div>

              </div>
            </section>

            {/* FINAL CTA PANEL */}
            <section className="max-w-5xl mx-auto px-6 text-center">
              <div className="bg-brand-charcoal text-white rounded-2xl p-10 border border-black/10 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-44 h-44 bg-brand-forest/10 rounded-full blur-3xl pointer-events-none" />
                
                <h2 className="text-3xl font-extrabold tracking-tight">Begin Your Compliance Journey Today</h2>
                <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
                  Analyze your industrial parameters, score environmental policy documents, detect critical gaps, and export audit-ready BRSR and OEM filing answers.
                </p>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setCurrentView('assessment')}
                    className="bg-brand-forest hover:bg-brand-green-sec text-white px-6 py-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    Take Free ESG Assessment <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentView('public-calculator')}
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
        {currentView === 'public-calculator' && (
          <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <span className="text-[10px] font-mono uppercase text-brand-forest tracking-widest font-bold bg-brand-sage/20 px-3 py-1 rounded-full">
                Interactive Carbon Accounting Logic
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-brand-charcoal tracking-tight">
                Instant Carbon Accounting Sandbox
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Calculate direct and indirect greenhouse gas values instantly using official emission coefficients. Fully aligned with SEBI BRSR Core and EU CBAM filing standards, this public tool demonstrates the underlying calculations of our secure multi-tenant platform.
              </p>
            </div>

            {/* Main tabbed card matching simpler interface than dashboard but dedicated and professional */}
            <div className="bg-white border border-brand-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-brand-border/60 pb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-brand-charcoal font-mono uppercase tracking-wide">
                    Select Accounting Scope
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Emission factors are calibrated to IPCC and Central Electricity Authority (CEA) of India coefficients.
                  </p>
                </div>
                
                {/* Tabs for Scope selection */}
                <div className="flex flex-wrap gap-1.5 bg-brand-offwhite p-1 rounded-xl border border-brand-border/60">
                  <button
                    onClick={() => setHomeScopeType('scope-1')}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      homeScopeType === 'scope-1'
                        ? 'bg-brand-charcoal text-white shadow-sm'
                        : 'text-gray-500 hover:text-brand-charcoal'
                    }`}
                  >
                    Scope 1 (Direct Fuel)
                  </button>
                  <button
                    onClick={() => setHomeScopeType('scope-2')}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      homeScopeType === 'scope-2'
                        ? 'bg-brand-charcoal text-white shadow-sm'
                        : 'text-gray-500 hover:text-brand-charcoal'
                    }`}
                  >
                    Scope 2 (Electricity Grid)
                  </button>
                  <button
                    onClick={() => setHomeScopeType('scope-3')}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      homeScopeType === 'scope-3'
                        ? 'bg-brand-charcoal text-white shadow-sm'
                        : 'text-gray-500 hover:text-brand-charcoal'
                    }`}
                  >
                    Scope 3 (Supply Chain)
                  </button>
                </div>
              </div>

              {/* Carbon Engine UI rendering */}
              <div className="transition-all duration-300">
                <CarbonEngineUI scopeType={homeScopeType} facilities={facilities} />
              </div>

            </div>

            {/* Simpler Interface than dashboard informational footer block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-brand-sage/10 rounded-2xl p-6 border border-brand-sage/25 text-xs text-gray-600">
              <div className="space-y-2">
                <h4 className="font-extrabold text-brand-forest font-mono uppercase text-[11px] tracking-wider">
                  How does the Sandbox differ from the Enterprise Dashboard?
                </h4>
                <p className="leading-relaxed text-[11.5px]">
                  The <strong>Public Sandbox</strong> operates in stateless guest mode, letting you run ad-hoc calculations on individual fuel combustion quantities or electricity grid values. It has a lightweight, non-relational interface.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-brand-forest font-mono uppercase text-[11px] tracking-wider">
                  Enterprise Client Capabilities
                </h4>
                <p className="leading-relaxed text-[11.5px]">
                  By signing in to your tenant account, you unlock secure multi-facility aggregations, physical utility bill upload processing with automated OCR document verification, audit trail logs reviewed by qualified officers, and downloadable compliance packages.
                </p>
                <button
                  onClick={() => { setIsSignUpMode(true); setCurrentView('login'); }}
                  className="text-brand-forest font-mono font-bold hover:underline flex items-center gap-1 mt-1 text-[11px]"
                >
                  Register Enterprise Tenant <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View: Services Detail */}
        {currentView === 'services' && (
          <div className="max-w-5xl mx-auto px-6 py-16 space-y-12">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-mono uppercase bg-brand-sage text-brand-forest px-2.5 py-1 rounded font-bold tracking-widest">
                Our Capabilities
              </span>
              <h1 className="text-3xl font-black text-brand-charcoal tracking-tight">Decarbonization Consulting & ESG Platforms</h1>
              <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
                We combine server-side calculated auditing code with technical engineering consultation to keep Indian industrial supply chains compliant and competitive.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="p-6 bg-white border border-brand-border rounded-xl space-y-3 shadow-sm">
                <h3 className="font-extrabold text-brand-charcoal text-sm font-mono uppercase tracking-wide">01 • Scope 1 & 2 Auditing</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ditch the fragile spreadsheets. Balancing Carbon maps diesel receipts and smart electric meters directly into our database ledger using Central Electricity Authority Grid emission coefficients.
                </p>
              </div>

              <div className="p-6 bg-white border border-brand-border rounded-xl space-y-3 shadow-sm">
                <h3 className="font-extrabold text-brand-charcoal text-sm font-mono uppercase tracking-wide">02 • OEM Questionnaire Ingestion</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We ingest complex auto-OEM compliance documents (Tata Motors, Mahindra, Maruti Suzuki), classify environmental questions automatically, search available corporate policies, and generate high-confidence drafts.
                </p>
              </div>

              <div className="p-6 bg-white border border-brand-border rounded-xl space-y-3 shadow-sm">
                <h3 className="font-extrabold text-brand-charcoal text-sm font-mono uppercase tracking-wide">03 • CBAM Carbon Border Assurances</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Track and verify the embedded greenhouse gases of raw steel, aluminum, and metals shipped to EU borders. Ensure audit compliance and prevent custom friction points.
                </p>
              </div>

              <div className="p-6 bg-white border border-brand-border rounded-xl space-y-3 shadow-sm">
                <h3 className="font-extrabold text-brand-charcoal text-sm font-mono uppercase tracking-wide">04 • Evidence Document Lockers</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Secure your State Pollution Control Board Consent-to-operate permits, factory solar power purchase agreements, and verified carbon declarations in high-security multi-tenant folder grids.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setCurrentView('assessment')}
              className="mx-auto block bg-brand-forest hover:bg-brand-green-sec text-white px-6 py-3 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              Analyze Your Current State <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View: Industries Detail */}
        {currentView === 'industries' && (
          <div className="max-w-5xl mx-auto px-6 py-16 space-y-12">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-mono uppercase bg-brand-sage text-brand-forest px-2.5 py-1 rounded font-bold tracking-widest">
                Target Sectors
              </span>
              <h1 className="text-3xl font-black text-brand-charcoal tracking-tight">Tailored to High-Intensity Engineering Hubs</h1>
              <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Our platform is modeled around the real manufacturing processes and regulatory contexts of Indian industrial exporters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-xs text-gray-500 leading-relaxed">
              
              <div className="p-5 bg-white border border-brand-border rounded-xl space-y-3 shadow-sm">
                <strong className="text-brand-charcoal text-xs font-mono uppercase tracking-wide block border-b border-brand-border pb-1">Auto Components</strong>
                <p>
                  Tier-1 and Tier-2 manufacturers supplying forgings, stampings, fasteners, and heavy cast gears. Fully aligned with Tata Motors and Mahindra supplier audit rules.
                </p>
              </div>

              <div className="p-5 bg-white border border-brand-border rounded-xl space-y-3 shadow-sm">
                <strong className="text-brand-charcoal text-xs font-mono uppercase tracking-wide block border-b border-brand-border pb-1">Metalworking & Forging</strong>
                <p>
                  Energy-intensive heat treatment lines, boilers, and CNC machining centers in Ludhiana, Faridabad, and Pune requiring intense diesel and electricity accounting.
                </p>
              </div>

              <div className="p-5 bg-white border border-brand-border rounded-xl space-y-3 shadow-sm">
                <strong className="text-brand-charcoal text-xs font-mono uppercase tracking-wide block border-b border-brand-border pb-1">Chemicals & Exporters</strong>
                <p>
                  Specialty process lines exporting raw chemicals, pharmaceutical intermediates, and metal parts subject to CBAM calculations at European customs ports.
                </p>
              </div>

            </div>

            <div className="bg-brand-charcoal text-white rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono">
              <div>
                <strong className="text-brand-sage block font-bold mb-1">MSME COMPLIANCE PROGRAM</strong>
                <span>Are you a mid-size engineering firm trying to keep your Tier-1 exporter contracts active?</span>
              </div>
              <button 
                onClick={() => setCurrentView('assessment')}
                className="bg-brand-forest hover:bg-brand-green-sec text-white px-4 py-2 rounded font-bold whitespace-nowrap cursor-pointer"
              >
                Assess MSME Readiness
              </button>
            </div>
          </div>
        )}

        {/* View: Free Interactive ESG Assessment form */}
        {currentView === 'assessment' && (
          <div className="max-w-5xl mx-auto px-6 py-16">
            <AssessmentForm onLoginRequest={() => { setIsSignUpMode(false); setCurrentView('login'); }} />
          </div>
        )}

        {/* View: Founding Vision / Our Vision */}
        {currentView === 'about' && (
          <div className="max-w-3xl mx-auto px-6 py-16 space-y-8 text-xs text-gray-500 leading-relaxed">
            <h1 className="text-3xl font-black text-brand-charcoal tracking-tight text-center">The Balancing Carbon Vision</h1>
            
            <div className="flex justify-center my-6">
              <AsymmetricInfinityLogo size="lg" />
            </div>

            <p>
              Our name, **Balancing Carbon**, represents the core challenge of the 21st-century manufacturing exporter: **balancing the relentless energy demands of heavy machinery with absolute, non-negotiable climate accountability.**
            </p>

            <p>
              We believe that environmental compliance should not be treated as a marketing slogan or a generic carbon-offset badge. For serious Indian manufacturing companies, ESG is a high-stakes operational priority. It is about preserving supplier licenses, protecting steel export shipments to Europe, and winning competitive bids for global OEM contracts.
            </p>

            <div className="p-5 bg-white border border-brand-border rounded-xl space-y-2">
              <strong className="text-brand-charcoal font-bold uppercase font-mono block">OUR PILLARS:</strong>
              <ul className="list-disc pl-4 space-y-1.5 text-gray-600 font-medium">
                <li><strong>Deterministic Integrity:</strong> We never "hallucinate" emissions. Every kilogram of calculated greenhouse gas is backed by verified utility invoices and approved national coefficients.</li>
                <li><strong>Secured Multi-Tenancy:</strong> Your factory's competitive secrets, energy mix patterns, and SPCB compliance licenses are completely isolated at the root database tier.</li>
                <li><strong>Augmented Operations:</strong> AI drafts high-quality compliance documentation, but human industrial compliance officers maintain the absolute stamp of review and approval.</li>
              </ul>
            </div>

            <p className="text-center font-bold text-brand-charcoal font-mono">
              "AI DRAFTS. HUMANS APPROVE." • ESTABLISHED 2025
            </p>
          </div>
        )}

        {/* View: Secure Log In & Sign Up Portal */}
        {currentView === 'login' && (
          <div className="max-w-md mx-auto px-6 py-16">
            <div className="bg-white border border-brand-border rounded-xl shadow-lg p-6 space-y-6">
              
              <div className="text-center space-y-1">
                <AsymmetricInfinityLogo size="md" className="mx-auto" />
                <h2 className="text-lg font-bold text-brand-charcoal font-mono uppercase tracking-wider pt-2">
                  {isSignUpMode ? 'Register Corporate Account' : 'Client Login Portal'}
                </h2>
                <p className="text-[11px] text-gray-400 font-mono">
                  {isSignUpMode ? 'Provision Isolated B2B Tenant' : 'Multi-Tenant Isolated Environment'}
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
                    <label className="block text-gray-500 font-mono mb-1">Corporate Email Address</label>
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
                    <label className="block text-gray-500 font-mono mb-1">Secure Password</label>
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
                    <Lock className="w-4 h-4 text-brand-sage" /> Authenticate Session
                  </button>
                </form>
              ) : (
                /* Signup / Provisioning Form */
                <form onSubmit={handleFormSignup} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-500 font-mono mb-1">Full Name</label>
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
                    <label className="block text-gray-500 font-mono mb-1">Corporate Email Address</label>
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
                    <label className="block text-gray-500 font-mono mb-1">Organization / Factory Name</label>
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
                    <label className="block text-gray-500 font-mono mb-1">Create Password</label>
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
                    <Building className="w-4 h-4 text-brand-sage" /> Register & Provision Tenant
                  </button>
                </form>
              )}

              <div className="border-t border-brand-border/60 pt-4 text-center text-xs">
                {isSignUpMode ? (
                  <p className="text-gray-500">
                    Already have an authorized account?{' '}
                    <button
                      onClick={() => {
                        setIsSignUpMode(false);
                        setSignupError('');
                      }}
                      className="text-brand-forest font-bold hover:underline font-mono"
                    >
                      Log In here
                    </button>
                  </p>
                ) : (
                  <p className="text-gray-500">
                    First time evaluating Balancing Carbon?{' '}
                    <button
                      onClick={() => {
                        setIsSignUpMode(true);
                        setLoginError('');
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
              Industrial ESG readiness, verified environmental folders, and deterministic carbon calculations for Indian manufacturing exporters.
            </p>
          </div>

          <div className="space-y-2">
            <strong className="text-white font-mono uppercase tracking-wide block">Platform Capabilities</strong>
            <button onClick={() => setCurrentView('services')} className="block hover:text-white hover:underline">Carbon Engine</button>
            <button onClick={() => setCurrentView('services')} className="block hover:text-white hover:underline">OEM Audits</button>
            <button onClick={() => setCurrentView('services')} className="block hover:text-white hover:underline">Evidence Vault</button>
          </div>

          <div className="space-y-2">
            <strong className="text-white font-mono uppercase tracking-wide block">Filing Frameworks</strong>
            <span className="block">SEBI BRSR Core India</span>
            <span className="block">EU CBAM Declarations</span>
            <span className="block">ISO 14001 Evidence</span>
          </div>

          <div className="space-y-2">
            <strong className="text-white font-mono uppercase tracking-wide block">Secure Tenancy</strong>
            <span className="block font-mono text-[10px]">CLAIM: multi-tenant-isolated</span>
            <span className="block">Active Port: 3000 (Cloud Run)</span>
            <span className="block">© 2026 Balancing Carbon Inc.</span>
          </div>

        </div>
      </footer>

    </div>
  );
}
