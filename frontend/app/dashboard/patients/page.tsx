"use client";

import React, { useEffect, useState } from "react";
import { getPatients, getPatientById } from "@/lib/api";
import { PatientProfile } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users,
  Search,
  Eye,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Selected patient for modal view
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientProfile | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    async function loadPatients() {
      try {
        const list = await getPatients();
        setPatients(list);
      } catch (err) {
        console.error("Failed to load patients:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPatients();
  }, []);

  const handleOpenDetail = async (id: number) => {
    setSelectedPatientId(id);
    setIsDetailLoading(true);
    try {
      const detail = await getPatientById(id);
      setPatientDetail(detail);
    } catch (err) {
      console.error("Failed to load patient detail:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = p.full_name?.toLowerCase().includes(term);
    const emailMatch = p.email?.toLowerCase().includes(term);
    const phoneMatch = p.phone?.toLowerCase().includes(term);
    return nameMatch || emailMatch || phoneMatch;
  });

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" />
            Patient Directory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Registered clinic patients, contact details, and clinical histories
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
        </div>
      </div>

      <Card className="shadow-elev1 border-border-default overflow-hidden">
        <CardHeader className="border-b border-border-default pb-4">
          <CardTitle className="text-base font-display text-navy">
            All Patients ({filteredPatients.length})
          </CardTitle>
          <CardDescription className="text-xs text-text-muted">
            Click &quot;View Profile&quot; to inspect full demographic and appointment data
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-text-muted">
              Loading patients...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="No patients found"
                description={
                  searchTerm
                    ? `No matching patient records found for "${searchTerm}".`
                    : "There are currently no patients registered in the clinic database."
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-gray/30 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar name={patient.full_name} size="md" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-navy">
                          {patient.full_name}
                        </span>
                        <Badge
                          variant={patient.is_active ? "success" : "neutral"}
                          className="text-[10px] py-0"
                        >
                          {patient.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {patient.email}
                        </span>
                        {patient.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {patient.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetail(patient.id)}
                    className="text-xs gap-1.5 self-start sm:self-auto"
                  >
                    <Eye className="w-3.5 h-3.5 text-accent" />
                    <span>View Profile</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Detail Modal */}
      <Dialog
        open={Boolean(selectedPatientId)}
        onOpenChange={(open) => !open && setSelectedPatientId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy">
              <User className="w-5 h-5 text-accent" />
              Patient Profile Details
            </DialogTitle>
            <DialogDescription>
              Complete clinical and demographic information for Patient #{selectedPatientId}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading || !patientDetail ? (
            <div className="py-8 text-center text-sm text-text-muted">
              Loading record...
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              <div className="flex items-center gap-3 p-3 bg-neutral-gray/50 rounded-card">
                <Avatar name={patientDetail.full_name} size="lg" />
                <div>
                  <h3 className="font-display font-bold text-sm text-navy">
                    {patientDetail.full_name}
                  </h3>
                  <p className="text-text-muted">{patientDetail.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 border border-border-default rounded-btn space-y-1">
                  <span className="text-text-muted flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </span>
                  <p className="font-medium text-navy text-sm">
                    {patientDetail.phone || "Not provided"}
                  </p>
                </div>

                <div className="p-3 border border-border-default rounded-btn space-y-1">
                  <span className="text-text-muted flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date of Birth
                  </span>
                  <p className="font-medium text-navy text-sm">
                    {patientDetail.date_of_birth
                      ? new Date(patientDetail.date_of_birth).toLocaleDateString()
                      : "Not provided"}
                  </p>
                </div>
              </div>

              <div className="p-3 border border-border-default rounded-btn space-y-1">
                <span className="text-text-muted flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Home Address
                </span>
                <p className="font-medium text-navy text-sm">
                  {patientDetail.address || "Not provided"}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-gray/30 rounded-btn text-text-muted">
                <span>Account Created:</span>
                <span className="font-medium text-navy">
                  {new Date(patientDetail.created_at).toLocaleDateString([], {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedPatientId(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
