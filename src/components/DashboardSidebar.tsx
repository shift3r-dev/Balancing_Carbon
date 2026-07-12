import React, { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Factory,
  Zap,
  Flame,
  ShieldAlert,
  FileCheck,
  FolderClosed,
  BarChart3,
  Bot,
  Lightbulb,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  ClipboardList,
  Database,
  Gauge,
  Target,
  CircleHelp,
} from "lucide-react";
import AsymmetricInfinityLogo from "./AsymmetricInfinityLogo.tsx";
import { ViewState } from "../types.ts";

interface SidebarUser {
  id?: string;
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
  organisationId?: string;
  organisation_id?: string;
}

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onLogout: () => void;
  user: SidebarUser | null;
}

export default function DashboardSidebar({
  currentView,
  onViewChange,
  onLogout,
  user,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const displayName = user?.name || user?.full_name || "User";
  const displayEmail = user?.email || "";

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const menuItems = [
    {
      label: "Command Center",
      items: [
        { id: "dashboard-overview", label: "Overview", icon: LayoutDashboard },
        { id: "dashboard-company", label: "Organisation", icon: Building2 },
        { id: "dashboard-facilities", label: "Facilities", icon: Factory },
      ],
    },
    {
      label: "Carbon Inventory",
      items: [
        { id: "dashboard-calculator", label: "Calculator", icon: BarChart3 },
        { id: "dashboard-energy", label: "Energy Ledger", icon: Zap },
        { id: "dashboard-energy", label: "Production", icon: Database },
        {
          id: "dashboard-emissions-scope1",
          label: "Scope 1",
          icon: Flame,
        },
        {
          id: "dashboard-emissions-scope2",
          label: "Scope 2",
          icon: BarChart3,
        },
        {
          id: "dashboard-emissions-scope3",
          label: "Scope 3",
          icon: BarChart3,
          badge: "Soon",
        },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { id: "dashboard-help", label: "Help & Learning", icon: CircleHelp },
        {
          id: "dashboard-intelligence",
          label: "Diagnostics",
          icon: Lightbulb,
        },
        {
          id: "dashboard-intelligence",
          label: "Hotspots",
          icon: Gauge,
        },
        {
          id: "dashboard-intelligence",
          label: "Scenario Modeller",
          icon: Target,
        },
        {
          id: "dashboard-intelligence",
          label: "Projects",
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Reporting & Evidence",
      items: [
        { id: "dashboard-reports", label: "Reports", icon: BarChart3 },
        { id: "dashboard-documents", label: "Documents", icon: FolderClosed },
        {
          id: "dashboard-questionnaires",
          label: "OEM",
          icon: FileCheck,
        },
        { id: "dashboard-esg", label: "ESG Readiness", icon: ShieldAlert },
      ],
    },
    {
      label: "System",
      items: [
        {
          id: "dashboard-ai-assistant",
          label: "Carbon AI Assistant",
          icon: Bot,
          isHot: true,
        },
        { id: "dashboard-metadata", label: "Metadata Studio", icon: Database },
        { id: "dashboard-data-platform", label: "Data Hub", icon: Database },
        { id: "dashboard-settings", label: "System Settings", icon: Settings },
        { id: "dashboard-settings", label: "Audit Logs", icon: ClipboardList, badge: "Soon" },
        { id: "dashboard-settings", label: "Notifications", icon: Bell, badge: "Soon" },
      ],
    },
  ];

  return (
    <div
      className={`bg-white text-brand-charcoal flex flex-col border-r border-brand-border transition-all duration-300 relative ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Collapse Toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-10 bg-brand-forest text-white w-6 h-6 rounded-full flex items-center justify-center border border-brand-border/20 shadow-md hover:bg-brand-green-sec cursor-pointer z-50"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Logo Area */}
      <div className="p-4 border-b border-brand-border flex items-center justify-between">
        {collapsed ? (
          <div className="mx-auto" title="Balancing Carbon">
            <AsymmetricInfinityLogo size="sm" hideText={true} />
          </div>
        ) : (
          <AsymmetricInfinityLogo size="sm" />
        )}
      </div>

      {/* Current Tenant Banner */}
      {!collapsed && (
        <div className="px-4 py-3 bg-brand-offwhite mx-3 mt-4 rounded-lg border border-brand-border">
          <div className="text-[10px] font-mono tracking-wider text-gray-400">
            ORGANISATION
          </div>
          <div className="text-xs font-semibold text-brand-charcoal mt-0.5 truncate">
            Apex Precision Components
          </div>
          <div className="text-[9px] font-mono text-brand-forest mt-0.5">
            ID: org-apex | Multi-Tenant
          </div>
        </div>
      )}

      {/* Sidebar Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {menuItems.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-2 font-mono">
                {group.label}
              </span>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewChange(item.id as ViewState)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative ${
                    isActive
                      ? "bg-brand-sage text-brand-forest font-semibold"
                      : "text-gray-500 hover:text-brand-forest hover:bg-brand-sage/20"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? "text-brand-forest" : "text-gray-400 group-hover:text-brand-forest"}`}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1 text-left">
                      {item.label}
                    </span>
                  )}

                  {!collapsed && item.badge && (
                    <span className="text-[8px] font-mono font-bold bg-brand-sage text-brand-forest px-1.5 py-0.5 rounded uppercase">
                      {item.badge}
                    </span>
                  )}

                  {!collapsed && item.isHot && (
                    <span className="text-[8px] font-mono font-bold bg-brand-forest text-white px-1.5 py-0.5 rounded uppercase animate-pulse">
                      AI Active
                    </span>
                  )}

                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-brand-charcoal text-white text-[10px] rounded font-mono shadow-md border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Info & Logout bottom tray */}
      <div className="p-3 border-t border-brand-border bg-brand-offwhite">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-forest text-brand-offwhite font-bold flex items-center justify-center text-xs shrink-0 select-none">
            {initials}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-brand-charcoal truncate leading-tight">
                {displayName}
              </div>

              <div className="text-[10px] text-gray-500 truncate leading-none">
                {displayEmail}
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            type="button"
            className="p-1.5 hover:bg-brand-red/10 hover:text-brand-red rounded-lg text-gray-500 transition-colors shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
