"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sparkles } from "lucide-react";

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role === "patient") {
        router.replace("/chat");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 animate-pulse">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent text-white shadow-elev2">
          <Sparkles className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">
            Smile Dental
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Loading your portal...
          </p>
        </div>
      </div>
    </div>
  );
}
