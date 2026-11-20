"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, Stethoscope } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white shadow-elev2 mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-display font-bold text-navy tracking-tight">
            Smile Dental
          </h1>
          <p className="text-sm text-text-muted">
            AI Receptionist & Clinic Management Portal
          </p>
        </div>

        <Card className="shadow-elev2 border-border-default">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-display font-semibold text-navy">
              Sign In
            </CardTitle>
            <CardDescription className="text-text-muted text-sm">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm rounded-btn bg-danger/10 border border-danger/20 text-danger flex items-center gap-2">
                  <span className="font-semibold">Error:</span> {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-text-muted">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-accent hover:underline"
              >
                Create one now
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials Box */}
        <div className="bg-white border border-border-default rounded-card p-4 shadow-sm text-xs space-y-2.5">
          <div className="font-medium text-navy flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Quick Demo Accounts (Click to autofill)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => fillCredentials("ali@example.com", "patient123")}
              className="text-left p-2 rounded-btn border border-border-default hover:bg-mint-soft hover:border-accent/40 transition-colors"
            >
              <div className="font-semibold text-navy flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-accent" />
                Patient (Ali)
              </div>
              <div className="text-text-muted text-[11px] truncate">ali@example.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("ahmed@dentalclinic.com", "doctor123")}
              className="text-left p-2 rounded-btn border border-border-default hover:bg-mint-soft hover:border-accent/40 transition-colors"
            >
              <div className="font-semibold text-navy flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-accent" />
                Doctor (Ahmed)
              </div>
              <div className="text-text-muted text-[11px] truncate">ahmed@dentalclinic.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
