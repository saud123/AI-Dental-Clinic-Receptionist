"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, History, User, Star, LogOut, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function NavLinks() {
  const pathname = usePathname();

  const navItems = [
    { href: "/chat", label: "AI Receptionist", icon: MessageSquare },
    { href: "/conversations", label: "Conversations", icon: MessageCircle }, // <-- ADDED THIS LINE
    { href: "/chat/history", label: "Chat History", icon: History },
    { href: "/profile", label: "Profile & QR", icon: User },
    { href: "/reviews", label: "Feedback", icon: Star },
  ];

  return (
    <>
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/chat"
              ? pathname === "/chat"
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-btn text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent/10 text-accent font-semibold"
                  : "text-text-muted hover:text-navy hover:bg-neutral-gray"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center justify-around border-t border-border-default py-2 bg-white px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/chat"
              ? pathname === "/chat"
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-btn text-xs font-medium",
                isActive ? "text-accent font-semibold" : "text-text-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function PatientNav() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-border-default shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/chat" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-navy tracking-tight">
                Smile Dental
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-pill bg-mint-soft text-accent font-medium">
                Patient Portal
              </span>
            </div>
          </Link>

          <Suspense fallback={<div className="hidden md:flex w-64 h-8" />}>
            <NavLinks />
          </Suspense>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2.5 pl-2">
              <Avatar name={user.full_name || "Patient"} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-navy leading-none">
                  {user.full_name}
                </p>
                <p className="text-xs text-text-muted leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-text-muted hover:text-danger"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}