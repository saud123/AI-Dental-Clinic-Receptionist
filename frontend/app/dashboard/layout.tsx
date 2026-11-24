"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  QrCode,
  LogOut,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types";

function DashboardNavLinks({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const isDoctor = role === "doctor" || role === "admin";
  const isAssistant = role === "assistant" || role === "admin";

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      show: true,
      exact: true,
    },
    {
      href: "/dashboard#inbox",
      label: "Inbox",
      icon: Mail,
      show: isDoctor,
      exact: false,
    },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: Calendar,
      show: true,
      exact: false,
    },
    {
      href: "/dashboard/availability",
      label: "Availability Blocks",
      icon: Clock,
      show: isDoctor,
      exact: false,
    },
    {
      href: "/dashboard/patients",
      label: "Patients Directory",
      icon: Users,
      show: true,
      exact: false,
    },
    {
      href: "/dashboard/scan",
      label: "Check-in Scanner",
      icon: QrCode,
      show: isDoctor || isAssistant,
      exact: false,
    },
  ];

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {navItems
        .filter((item) => item.show)
        .map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname?.startsWith(item.href.split("#")[0]));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-btn text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-slate-800 text-teal-400 font-semibold border-l-2 border-teal-400 shadow-sm shadow-teal-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "patient") {
        router.replace("/chat");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center text-sm text-text-muted">
        Loading clinic portal...
      </div>
    );
  }

  if (!user || user.role === "patient") {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col md:flex-row">
      {/* 240px Sidebar */}
      <aside className="w-full md:w-[240px] bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-white leading-none">
              Smile Dental
            </h1>
            <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
              Clinic Staff Portal
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2.5">
          <Avatar name={user.full_name} size="md" />
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {user.role === "doctor" ? `Dr. ${user.full_name}` : user.full_name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge
                variant={
                  user.role === "doctor"
                    ? "accent"
                    : user.role === "admin"
                    ? "warning"
                    : "neutral"
                }
                className="text-[10px] py-0 px-1.5"
              >
                {user.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation wrapped in Suspense */}
        <Suspense fallback={<div className="flex-1 p-4 text-xs text-slate-400">Loading menu...</div>}>
          <DashboardNavLinks role={user.role} />
        </Suspense>

        {/* Logout */}
        <div className="p-3 border-t border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="w-full justify-start text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Suspense fallback={<div className="p-6 text-sm text-text-muted">Loading view...</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
