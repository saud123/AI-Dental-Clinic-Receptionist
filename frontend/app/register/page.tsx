"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CheckCircle, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email,
        password,
        full_name: fullName,
        role: "patient",
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
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
            Join as a patient to chat with our AI receptionist & book appointments
          </p>
        </div>

        <Card className="shadow-elev2 border-border-default">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-display font-semibold text-navy">
              Create an Account
            </CardTitle>
            <CardDescription className="text-text-muted text-sm">
              Enter your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-navy">
                    Registration Successful!
                  </h3>
                  <p className="text-sm text-text-muted mt-1">
                    Redirecting to sign-in page...
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push("/login")}
                >
                  Continue to Login
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm rounded-btn bg-danger/10 border border-danger/20 text-danger flex items-center gap-2">
                    <span className="font-semibold">Error:</span> {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
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
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Register"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>

                <div className="pt-2 text-center text-sm text-text-muted">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-accent hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
