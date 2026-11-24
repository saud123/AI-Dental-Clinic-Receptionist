"use client";

import React, { useEffect, useState } from "react";
import { PatientNav } from "@/components/patient-nav";
import { getPatientMe, updatePatientMe, getMyQr, revokeMyQr } from "@/lib/api";
import { PatientProfile, QrResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import {
  User,
  QrCode,
  RefreshCw,
  Save,
  CheckCircle2,
  Calendar,
  Phone,
  MapPin,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");

  const fetchData = async () => {
    try {
      const [pRes, qRes] = await Promise.allSettled([getPatientMe(), getMyQr()]);
      if (pRes.status === "fulfilled") {
        const p = pRes.value;
        setProfile(p);
        setFullName(p.full_name || "");
        setPhone(p.phone || "");
        setDateOfBirth(p.date_of_birth ? p.date_of_birth.split("T")[0] : "");
        setAddress(p.address || "");
      }
      if (qRes.status === "fulfilled") {
        setQr(qRes.value);
      }
    } catch (err) {
      console.error("Failed to load profile or QR:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccessMessage(null);
    try {
      const updated = await updatePatientMe({
        full_name: fullName,
        phone: phone || undefined,
        date_of_birth: dateOfBirth || undefined,
        address: address || undefined,
      });
      setProfile(updated);
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to update profile.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerateQr = async () => {
    setIsRevoking(true);
    try {
      await revokeMyQr();
      const freshQr = await getMyQr();
      setQr(freshQr);
    } catch (err) {
      console.error("Failed to regenerate QR:", err);
      alert("Failed to regenerate QR code.");
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col">
        <PatientNav />
        <div className="flex-1 flex items-center justify-center text-sm text-text-muted">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PatientNav />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">
            Patient Profile & Fast Check-In
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage your personal dental records and your contactless clinic check-in QR code
          </p>
        </div>

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-card text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information (Left 2 cols) */}
          <div className="lg:col-span-2">
            <Card className="shadow-elev1 border-border-default h-full">
              <CardHeader className="border-b border-border-default pb-4">
                <CardTitle className="text-lg font-display text-navy flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-xs text-text-muted">
                  Keep your dental records up to date for your upcoming clinic visits
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          value={profile?.email || ""}
                          disabled
                          className="bg-neutral-gray text-text-muted cursor-not-allowed pl-8"
                        />
                        <Mail className="w-4 h-4 text-text-muted absolute left-2.5 top-3" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          placeholder="+1 (555) 000-0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-8"
                        />
                        <Phone className="w-4 h-4 text-text-muted absolute left-2.5 top-3" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <div className="relative">
                        <Input
                          id="dob"
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="pl-8"
                        />
                        <Calendar className="w-4 h-4 text-text-muted absolute left-2.5 top-3" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address">Home Address</Label>
                    <div className="relative">
                      <Input
                        id="address"
                        placeholder="123 Dental Way, Suite 4"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="pl-8"
                      />
                      <MapPin className="w-4 h-4 text-text-muted absolute left-2.5 top-3" />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isUpdating}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Check-in Card (Right 1 col) */}
          <div className="lg:col-span-1">
            <Card className="shadow-elev1 border-border-default h-full flex flex-col">
              <CardHeader className="border-b border-border-default pb-4">
                <CardTitle className="text-lg font-display text-navy flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-accent" />
                  Clinic Check-in QR
                </CardTitle>
                <CardDescription className="text-xs text-text-muted">
                  Present this code upon arrival
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 flex-1 flex flex-col items-center justify-between text-center space-y-4">
                <div className="p-4 bg-white border-2 border-dashed border-border-default rounded-card shadow-md animate-float">
                  {qr?.token ? (
                    <QRCodeSVG
                      value={qr.token}
                      size={180}
                      level="H"
                      className="rounded"
                    />
                  ) : qr?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qr.image}
                      alt="Check-in QR"
                      className="w-[180px] h-[180px] object-contain rounded"
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] bg-neutral-gray flex items-center justify-center text-xs text-text-muted">
                      No QR active
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-xs text-accent bg-mint-soft px-3 py-1 rounded-pill font-mono font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      {qr?.token
                        ? `Token: ${qr.token.slice(0, 10)}...${qr.token.slice(-6)}`
                        : "NO_TOKEN"}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted max-w-[240px] mx-auto">
                    The front desk assistant scans this code to instantly verify your appointment and check you in.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateQr}
                  disabled={isRevoking}
                  className="w-full text-xs gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRevoking ? "animate-spin" : ""}`}
                  />
                  <span>{isRevoking ? "Regenerating..." : "Regenerate Code"}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
