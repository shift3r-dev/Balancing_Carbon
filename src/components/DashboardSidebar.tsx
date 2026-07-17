import React, { useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  Database,
  Target,
  CircleHelp,
  Users,
  Globe2,
  Store,
  Search,
  X,
} from "lucide-react";
import AsymmetricInfinityLogo from "./AsymmetricInfinityLogo.tsx";
import { ViewState } from "../types.ts";
import { hasAdminAccess, hasPlatformAdminAccess } from "../utils/adminAccess.ts";

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
  organisation?: { id?: string; name?: string } | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function DashboardSidebar({
  currentView,
  onViewChange,
  onLogout,
  user,
  organisation,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const displayName = user?.name || user?.full_name || "User";
  const displayEmail = user?.email || "";
  const isAdmin = hasAdminAccess(user?.role);
  const isPlatformAdmin = hasPlatformAdminAccess(user?.role);

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const menuItems = useMemo(() => [
    {
      label: "Home",
      icon: LayoutDashboard,
      items: [
        { id: "dashboard-overview", label: "Overview", icon: LayoutDashboard },
        { id: "dashboard-company", label: "Organisation", icon: Building2 },
        { id: "dashboard-facilities", label: "Facilities", icon: Factory },
      ],
    },
    {
      label: "Measure",
      icon: Zap,
      items: [
        { id: "dashboard-calculator", label: "Calculator", icon: BarChart3 },
        { id: "dashboard-energy", label: "Activity & Production", icon: Zap },
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
        },
      ],
    },
    {
      label: "Improve",
      icon: Lightbulb,
      items: [
        {
          id: "dashboard-intelligence",
          label: "Carbon Intelligence",
          icon: Lightbulb,
          badge: "4 tools",
        },
        { id: "dashboard-analytics", label: "Analytics Studio", icon: BarChart3 },
        { id: "dashboard-sustainability", label: "Sustainability Planner", icon: Target },
        { id: "dashboard-ai-assistant", label: "Carbon AI Assistant", icon: Bot, badge: "AI" },
      ],
    },
    {
      label: "Report",
      icon: FileCheck,
      items: [
        { id: "dashboard-reports", label: "Reports", icon: BarChart3 },
        { id: "dashboard-documents", label: "Documents", icon: FolderClosed },
        {
          id: "dashboard-questionnaires",
          label: "OEM",
          icon: FileCheck,
        },
        { id: "dashboard-esg", label: "ESG Readiness", icon: ShieldAlert },
        { id: "dashboard-collaboration", label: "Collaboration", icon: Users },
        { id: "dashboard-public-portal", label: "Public ESG Portal", icon: Globe2 },
      ],
    },
    {
      label: "Connect",
      icon: Database,
      items: [
        { id: "dashboard-data-platform", label: "Data Hub", icon: Database },
        { id: "dashboard-metadata", label: "Metadata Studio", icon: Database },
        { id: "dashboard-marketplace", label: "Marketplace", icon: Store },
      ],
    },
    {
      label: "Manage",
      icon: Settings,
      items: [
        ...(isPlatformAdmin ? [{ id: "dashboard-platform-admin", label: "Platform Console", icon: ShieldAlert, badge: "Owner" }] : []),
        ...(isAdmin ? [{ id: "dashboard-admin", label: "Admin Console", icon: ShieldAlert, badge: "Admin" }] : []),
        { id: "dashboard-help", label: "Help & Learning", icon: CircleHelp },
        { id: "dashboard-settings", label: "Settings & Subscription", icon: Settings },
      ],
    },
  ], [isAdmin, isPlatformAdmin]);

  const activeGroup = useMemo(
    () => menuItems.find((group) => group.items.some((item) => item.id === currentView))?.label ?? "Home",
    [currentView, menuItems],
  );
  const [openGroup, setOpenGroup] = useState(activeGroup);

  useEffect(() => { setOpenGroup(activeGroup); }, [activeGroup]);

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return menuItems;
    return menuItems
      .map((group) => ({ ...group, items: group.items.filter((item) => `${group.label} ${item.label}`.toLowerCase().includes(normalized)) }))
      .filter((group) => group.items.length);
  }, [menuItems, query]);

  const navigate = (view: ViewState) => {
    onViewChange(view);
    onMobileClose?.();
  };

  return (
    <>
    {mobileOpen && <button type="button" aria-label="Close navigation" onClick={onMobileClose} className="dashboard-nav-backdrop" />}
    <aside
      aria-label="Dashboard navigation"
      className={`dashboard-sidebar bg-white text-brand-charcoal flex flex-col border-r border-brand-border transition-all duration-300 relative ${mobileOpen ? "dashboard-sidebar-open" : ""} ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Collapse Toggle */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="sidebar-collapse absolute -right-3 top-10 bg-brand-forest text-white w-6 h-6 rounded-full flex items-center justify-center border border-brand-border/20 shadow-md hover:bg-brand-green-sec cursor-pointer z-50"
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
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
        <button type="button" onClick={onMobileClose} aria-label="Close navigation" className="dashboard-nav-close studio-mini"><X /></button>
      </div>

      {/* Current Tenant Banner */}
      {!collapsed && (
        <div className="px-4 py-3 bg-brand-offwhite mx-3 mt-4 rounded-lg border border-brand-border">
          <div className="text-[10px] font-mono tracking-wider text-gray-400">
            ORGANISATION
          </div>
          <div className="text-xs font-semibold text-brand-charcoal mt-0.5 truncate">
            {organisation?.name || "Organisation workspace"}
          </div>
          <div className="text-[9px] font-mono text-brand-forest mt-0.5">
            ID: {organisation?.id || user?.organisationId || user?.organisation_id || "Pending"}
          </div>
        </div>
      )}

      {!collapsed && <div className="px-3 pt-3"><label className="relative block"><span className="sr-only">Search navigation</span><Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a workspace" className="w-full h-9 pl-9 pr-3 bg-brand-offwhite border border-brand-border rounded text-xs outline-none focus:border-brand-forest" /></label></div>}

      {/* Sidebar Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const groupActive = group.label === activeGroup;
          const groupOpen = Boolean(query.trim()) || group.label === openGroup;
          if (collapsed) return (
            <button
              key={group.label}
              type="button"
              onClick={() => { setCollapsed(false); setOpenGroup(group.label); }}
              className={`w-full h-11 flex items-center justify-center rounded-lg relative group ${groupActive ? "bg-brand-sage text-brand-forest" : "text-gray-400 hover:bg-brand-sage/20 hover:text-brand-forest"}`}
              title={group.label}
              aria-label={`Open ${group.label} workspace`}
            >
              <GroupIcon className="w-4 h-4" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-brand-charcoal text-white text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 z-50 whitespace-nowrap">{group.label}</span>
            </button>
          );
          return (
          <div key={group.label} className="space-y-1">
            <button
              type="button"
              onClick={() => setOpenGroup((current) => current === group.label ? "" : group.label)}
              className={`w-full h-10 px-3 rounded-lg flex items-center gap-3 text-xs font-bold transition ${groupActive ? "text-brand-forest" : "text-gray-500 hover:bg-brand-offwhite hover:text-brand-charcoal"}`}
              aria-expanded={groupOpen}
            >
              <GroupIcon className={`w-4 h-4 shrink-0 ${groupActive ? "text-brand-forest" : "text-gray-400"}`} />
              <span className="flex-1 text-left">{group.label}</span>
              {groupActive && <span className="w-1.5 h-1.5 bg-brand-forest rounded-full" aria-label="Current workspace" />}
              {groupOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {groupOpen && <div className="pl-3 space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={`${group.label}-${item.label}`}
                  type="button"
                  onClick={() => navigate(item.id as ViewState)}
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
                  <span className="truncate flex-1 text-left">{item.label}</span>

                  {item.badge && (
                    <span className="text-[8px] font-mono font-bold bg-brand-sage text-brand-forest px-1.5 py-0.5 rounded uppercase">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            </div>}
          </div>
        );})}
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
    </aside>
    </>
  );
}
