"use client";

import React, { useEffect, useRef, useState } from "react";
import { resolveQr } from "@/lib/api";
import { QrResolved } from "@/lib/types";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  QrCode,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  User,
  RotateCcw,
  Camera,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function QrScannerPage() {
  const [resolvedPatient, setResolvedPatient] = useState<QrResolved | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    setError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await handleResolve(decodedText);
        },
        () => {
          // Frame error (no QR detected in frame) - ignore
        }
      );
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn("Camera could not be started:", err);
      setIsCameraActive(false);
      setError(
        "Camera access not available or permitted. You can manually enter the QR check-in code below."
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isCameraActive) {
      try {
        await scannerRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleResolve = async (token: string) => {
    if (!token.trim()) return;
    setIsResolving(true);
    setError(null);

    // Stop camera on match
    await stopScanner();

    try {
      const res = await resolveQr(token.trim());
      setResolvedPatient(res);
      setManualToken("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid or expired QR code.");
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleResolve(manualToken);
  };

  const handleReset = async () => {
    setResolvedPatient(null);
    setError(null);
    setManualToken("");
    await startScanner();
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
          <QrCode className="w-6 h-6 text-accent" />
          Reception QR Check-In Scanner
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Scan the patient&apos;s digital check-in code to verify their identity and upcoming dental appointments
        </p>
      </div>

      {resolvedPatient ? (
        /* Resolved Patient Check-in Card */
        <Card className="shadow-elev2 border-emerald-200 bg-white overflow-hidden animate-in fade-in duration-300">
          <CardHeader className="bg-emerald-50 border-b border-emerald-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-display text-emerald-950">
                    Patient Verified & Checked In!
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-700">
                    ID #{resolvedPatient.patient_id} verified via dynamic QR code
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-xs bg-white text-navy border-emerald-300 hover:bg-emerald-100"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                <span>Scan Another</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-neutral-gray/50 rounded-card space-y-1">
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <User className="w-4 h-4 text-accent" /> Full Name
                </span>
                <p className="text-base font-semibold text-navy">
                  {resolvedPatient.full_name}
                </p>
              </div>

              <div className="p-3.5 bg-neutral-gray/50 rounded-card space-y-1">
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-accent" /> Email
                </span>
                <p className="text-base font-semibold text-navy">
                  {resolvedPatient.email}
                </p>
              </div>

              <div className="p-3.5 bg-neutral-gray/50 rounded-card space-y-1">
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-accent" /> Phone
                </span>
                <p className="text-base font-semibold text-navy">
                  {resolvedPatient.phone || "No phone on record"}
                </p>
              </div>

              <div className="p-3.5 bg-mint-soft border border-accent/30 rounded-card space-y-1">
                <span className="text-xs text-accent font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-accent" /> Next Appointment
                </span>
                <p className="text-base font-bold text-navy">
                  {resolvedPatient.next_appointment_at
                    ? new Date(resolvedPatient.next_appointment_at).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "No upcoming appointment scheduled"}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={handleReset} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Ready for Next Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Scanner & Manual Input UI */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Scanner Container */}
          <Card className="shadow-elev1 border-border-default overflow-hidden flex flex-col">
            <CardHeader className="border-b border-border-default pb-3">
              <CardTitle className="text-base font-display text-navy flex items-center gap-2">
                <Camera className="w-4 h-4 text-accent" />
                Live Camera Scanner
              </CardTitle>
              <CardDescription className="text-xs text-text-muted">
                Point reception camera at patient&apos;s phone screen
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col items-center justify-center p-6 space-y-4">
              <div
                id="qr-reader"
                className="w-full max-w-[320px] aspect-square rounded-card overflow-hidden bg-neutral-gray border border-border-default flex items-center justify-center text-xs text-text-muted"
              >
                {!isCameraActive && (
                  <div className="text-center p-4 space-y-2">
                    <Camera className="w-8 h-8 text-text-muted mx-auto" />
                    <p>Camera is currently idle.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 w-full max-w-[320px]">
                {!isCameraActive ? (
                  <Button
                    variant="primary"
                    onClick={startScanner}
                    className="w-full text-xs gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={stopScanner}
                    className="w-full text-xs"
                  >
                    Stop Camera
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Input Container */}
          <Card className="shadow-elev1 border-border-default flex flex-col">
            <CardHeader className="border-b border-border-default pb-3">
              <CardTitle className="text-base font-display text-navy flex items-center gap-2">
                <QrCode className="w-4 h-4 text-accent" />
                Manual Code Entry
              </CardTitle>
              <CardDescription className="text-xs text-text-muted">
                Enter or paste the check-in token string manually
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 flex-1 flex flex-col justify-between space-y-4">
              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-card text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tokenInput">Patient QR Check-in Token</Label>
                  <Input
                    id="tokenInput"
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    required
                    className="font-mono text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs gap-1.5"
                  disabled={!manualToken.trim() || isResolving}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isResolving ? "Resolving Patient..." : "Resolve Check-In"}
                </Button>
              </form>

              <div className="p-3.5 bg-neutral-gray/60 rounded-btn text-xs text-text-muted space-y-1 border border-border-default">
                <p className="font-semibold text-navy">
                  Reception Desk Instructions:
                </p>
                <p>
                  Patients display their personalized QR token from the &quot;Profile &amp; QR&quot; tab on their mobile device upon clinic arrival.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
