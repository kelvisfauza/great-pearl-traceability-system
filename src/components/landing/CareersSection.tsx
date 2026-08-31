import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, MapPin, CalendarDays, CheckCircle2, Upload, Loader2 } from "lucide-react";
import { COMPANY_NAME, COMPANY_EMAIL, COMPANY_PHONE_OPS } from "@/utils/companyBrand";

interface Opening {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  summary: string | null;
  responsibilities: string | null;
  requirements: string | null;
  salary_range: string | null;
  closing_date: string | null;
}

const EDUCATION_LEVELS = [
  "Primary", "O-Level (UCE)", "A-Level (UACE)", "Certificate", "Diploma",
  "Bachelor's Degree", "Post-Graduate Diploma", "Master's Degree", "Other",
];

const emptyForm = {
  applicant_name: "", phone: "", email: "", gender: "", date_of_birth: "",
  national_id: "", address: "", education_level: "", institution: "",
  years_experience: "", current_employer: "", current_position: "",
  expected_salary: "", availability_date: "", cover_letter: "", referees: "",
};

export default function CareersSection() {
  const { toast } = useToast();
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Opening | null>(null);
  const [generalTitle, setGeneralTitle] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [cv, setCv] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("job_openings")
        .select("*")
        .eq("is_open", true)
        .order("created_at", { ascending: false });
      setOpenings((data as Opening[]) || []);
      setLoading(false);
    })();
  }, []);

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openApply = (opening: Opening | null) => {
    setSelected(opening);
    setGeneralTitle(opening ? opening.title : "");
    setForm({ ...emptyForm });
    setCv(null);
    setAccepted(false);
    setRef(null);
    setDialogOpen(true);
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const position = selected ? selected.title : generalTitle.trim();
    if (!position) {
      toast({ title: "Position required", description: "Tell us the role you are applying for.", variant: "destructive" });
      return;
    }
    if (!accepted) {
      toast({ title: "Terms not accepted", description: "Please accept the terms and conditions.", variant: "destructive" });
      return;
    }
    if (cv && cv.size > 5 * 1024 * 1024) {
      toast({ title: "CV too large", description: "Maximum CV size is 5MB.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        ...form,
        years_experience: form.years_experience || null,
        expected_salary: form.expected_salary || null,
        date_of_birth: form.date_of_birth || null,
        availability_date: form.availability_date || null,
        job_applied_for: position,
        opening_id: selected?.id || null,
        terms_accepted: true,
      };
      if (cv) {
        body.cv_base64 = await fileToBase64(cv);
        body.cv_filename = cv.name;
      }
      const { data, error } = await supabase.functions.invoke("submit-job-application", { body });
      if (error) throw error;
      const payload = data as { ok: boolean; ref_code?: string; error?: string };
      if (!payload?.ok) throw new Error(payload?.error || "Submission failed");
      setRef(payload.ref_code!);
      toast({ title: "Application received", description: `Reference ${payload.ref_code}` });
    } catch (err) {
      toast({ title: "Could not submit", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="careers" className="border-y bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Careers at {COMPANY_NAME}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              We are always looking for people who care about coffee, farmers and doing work
              properly. Browse our current openings below and apply online — applications are
              reviewed by our Human Resources team and you will receive updates by SMS and email.
            </p>
          </div>
          <Button size="lg" onClick={() => openApply(null)}>Apply now</Button>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading openings…</p>
        ) : openings.length === 0 ? (
          <div className="mt-10 rounded-lg border bg-card p-8 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-medium">No advertised vacancies right now</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              You can still submit an open application. We keep applications on file and contact
              candidates when a matching position opens up.
            </p>
            <Button className="mt-5" onClick={() => openApply(null)}>Submit an open application</Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {openings.map((o) => (
              <article key={o.id} className="flex flex-col rounded-lg border bg-card p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-medium">{o.title}</h3>
                  {o.employment_type && <Badge variant="secondary">{o.employment_type}</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {o.department && <span>{o.department}</span>}
                  {o.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{o.location}</span>}
                  {o.closing_date && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />Closes {o.closing_date}
                    </span>
                  )}
                </div>
                {o.summary && <p className="mt-4 text-sm text-muted-foreground">{o.summary}</p>}
                {o.requirements && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Requirements</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{o.requirements}</p>
                  </div>
                )}
                {o.responsibilities && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Responsibilities</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{o.responsibilities}</p>
                  </div>
                )}
                {o.salary_range && (
                  <p className="mt-4 text-sm"><span className="text-muted-foreground">Salary range: </span>{o.salary_range}</p>
                )}
                <Button className="mt-6 self-start" onClick={() => openApply(o)}>Apply now</Button>
              </article>
            ))}
          </div>
        )}

        {/* Terms and conditions */}
        <div className="mt-12 rounded-lg border bg-card p-6">
          <h3 className="text-lg font-medium">Recruitment terms &amp; conditions</h3>
          <ScrollArea className="mt-4 h-64 rounded border bg-muted/30 p-4">
            <div className="space-y-3 pr-3 text-sm text-muted-foreground">
              <p><strong>1. Equal opportunity.</strong> {COMPANY_NAME} is an equal opportunity employer. All applications are considered on merit, without regard to gender, tribe, religion, disability, marital status or political affiliation.</p>
              <p><strong>2. No recruitment fees.</strong> We never ask for money at any stage of recruitment — not for application, shortlisting, interviews, medical checks or appointment. Any person requesting payment on our behalf is acting fraudulently and should be reported to {COMPANY_EMAIL} or {COMPANY_PHONE_OPS}.</p>
              <p><strong>3. Accuracy of information.</strong> By submitting this application you confirm that all information and documents supplied are true and complete. Any false statement, forged academic document or concealed criminal record will lead to immediate disqualification, and to summary dismissal if discovered after employment.</p>
              <p><strong>4. Verification and referees.</strong> You authorise us to verify your academic papers, employment history, national identification and referee statements with the relevant institutions and persons, and to contact your named referees without further notice to you.</p>
              <p><strong>5. Data protection.</strong> Your personal data (name, contacts, date of birth, national ID, employment history, salary expectation and CV) is collected and processed solely for recruitment purposes, in line with the Uganda Data Protection and Privacy Act, 2019. Data is stored securely in our internal system, accessible only to authorised Human Resources and management staff, and retained for up to 24 months, after which unsuccessful applications are deleted. You may request access to, correction of, or deletion of your data by writing to {COMPANY_EMAIL}.</p>
              <p><strong>6. Communication.</strong> By applying you consent to receive SMS and email messages from us regarding this application, including acknowledgement, interview invitations and final outcome. Ensure the phone number and email you provide are active and belong to you.</p>
              <p><strong>7. Shortlisting.</strong> Only shortlisted candidates will be contacted for interviews. Submission of an application does not create any employment relationship, obligation or expectation of employment. We reserve the right to withdraw an advertised position, extend a deadline, or make no appointment at all.</p>
              <p><strong>8. Documents.</strong> Attach one CV in PDF or Word format not exceeding 5MB. Certified copies of academic transcripts, national ID and previous appointment letters must be produced at interview stage in original form.</p>
              <p><strong>9. Medical fitness and probation.</strong> Successful candidates may be required to undergo a medical examination and will serve a probation period of up to six months, during which either party may terminate the engagement in accordance with the Employment Act, 2006.</p>
              <p><strong>10. Confidentiality.</strong> All applicants shall treat any company information encountered during the recruitment process as confidential, and successful candidates will be required to sign a confidentiality and code-of-conduct undertaking.</p>
              <p><strong>11. Canvassing.</strong> Any form of canvassing, lobbying or influencing of staff or management in relation to an application will lead to automatic disqualification.</p>
              <p><strong>12. Governing law.</strong> These terms are governed by the laws of the Republic of Uganda.</p>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Application dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {ref ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">Application received</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your reference number is <span className="font-mono font-semibold text-foreground">{ref}</span>.
                We have sent a confirmation to your phone and email. Keep this reference for follow-up.
              </p>
              <Button className="mt-6" onClick={() => setDialogOpen(false)}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{selected ? `Apply — ${selected.title}` : "Job application"}</DialogTitle>
                <DialogDescription>
                  Fill in your details below. Fields marked * are required.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={submit} className="space-y-5">
                {!selected && (
                  <div className="space-y-2">
                    <Label htmlFor="position">Position applied for *</Label>
                    <Input id="position" value={generalTitle} onChange={(e) => setGeneralTitle(e.target.value)} placeholder="e.g. Store Assistant" required />
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold">Personal information</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="applicant_name">Full name *</Label>
                      <Input id="applicant_name" value={form.applicant_name} onChange={(e) => set("applicant_name", e.target.value)} required maxLength={120} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number *</Label>
                      <Input id="phone" type="tel" placeholder="0781000000" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address *</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required maxLength={255} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of birth</Label>
                      <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nin">National ID (NIN)</Label>
                      <Input id="nin" value={form.national_id} onChange={(e) => set("national_id", e.target.value)} maxLength={30} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address">Home address / district</Label>
                      <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold">Education</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Highest level of education</Label>
                      <Select value={form.education_level} onValueChange={(v) => set("education_level", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="institution">Institution attended</Label>
                      <Input id="institution" value={form.institution} onChange={(e) => set("institution", e.target.value)} maxLength={150} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold">Working experience</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="years">Years of experience</Label>
                      <Input id="years" type="number" min={0} max={60} step="0.5" value={form.years_experience} onChange={(e) => set("years_experience", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employer">Current / most recent employer</Label>
                      <Input id="employer" value={form.current_employer} onChange={(e) => set("current_employer", e.target.value)} maxLength={150} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpos">Current / most recent position</Label>
                      <Input id="cpos" value={form.current_position} onChange={(e) => set("current_position", e.target.value)} maxLength={150} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avail">Available to start from</Label>
                      <Input id="avail" type="date" value={form.availability_date} onChange={(e) => set("availability_date", e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="salary">Expected monthly salary (UGX)</Label>
                      <Input id="salary" type="number" min={0} step="1000" value={form.expected_salary} onChange={(e) => set("expected_salary", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover">Cover letter / why you suit this role</Label>
                  <Textarea id="cover" rows={5} maxLength={3000} value={form.cover_letter} onChange={(e) => set("cover_letter", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referees">Referees (name, position, phone)</Label>
                  <Textarea id="referees" rows={3} maxLength={1000} value={form.referees} onChange={(e) => set("referees", e.target.value)} placeholder="1. Jane Doe, Store Manager, 0781000000" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cv" className="inline-flex items-center gap-2"><Upload className="h-4 w-4" />Attach your CV (PDF or Word, max 5MB)</Label>
                  <Input id="cv" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCv(e.target.files?.[0] || null)} />
                  {cv && <p className="text-xs text-muted-foreground">{cv.name} · {(cv.size / 1024 / 1024).toFixed(2)}MB</p>}
                </div>

                <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-4">
                  <Checkbox id="terms" checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} />
                  <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
                    I have read and accept the recruitment terms &amp; conditions, I confirm the
                    information given is true, and I consent to being contacted by SMS and email
                    about this application. *
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>) : "Submit application"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
