import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Leaf, ShieldCheck, Truck, Factory, Globe2, Phone, Mail, MapPin, ArrowRight, ExternalLink,
} from "lucide-react";
import {
  LOGO_URL, COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS,
  COMPANY_PHONE, COMPANY_PHONE_OPS, COMPANY_EMAIL, COMPANY_WEBSITE, COMPANY_REG,
} from "@/utils/companyBrand";
import InquiryForm from "@/components/landing/InquiryForm";
import CareersSection from "@/components/landing/CareersSection";

const WEBSITE_URL = "https://www.greatpearlcoffee.com";

const services = [
  { icon: Leaf, title: "Coffee Sourcing", text: "Direct purchase from smallholder farmers across the Rwenzori region, paid fairly and on time." },
  { icon: Factory, title: "Processing & Milling", text: "Hulling, grading and cleaning in our Kasese facility with documented batch tracking." },
  { icon: ShieldCheck, title: "Quality Assurance", text: "Moisture, defect and screen analysis on every lot, with signed analysis certificates." },
  { icon: Globe2, title: "EUDR Traceability", text: "Farm-level geolocation and due-diligence records for European market compliance." },
  { icon: Truck, title: "Logistics", text: "Warehousing, weighbridge control and transport to Kampala and Mombasa corridors." },
  { icon: Globe2, title: "Export", text: "Arabica and Robusta green coffee contracts, shipped with full documentation." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="#top" className="flex items-center gap-3 min-w-0">
            <img src={LOGO_URL} alt={`${COMPANY_NAME} logo`} className="h-10 w-10 rounded object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide truncate">{COMPANY_NAME}</p>
              <p className="text-[11px] text-muted-foreground truncate">{COMPANY_TAGLINE}</p>
            </div>
          </a>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#about" className="text-muted-foreground hover:text-foreground">About</a>
            <a href="#services" className="text-muted-foreground hover:text-foreground">What we do</a>
            <a href="#inquiry" className="text-muted-foreground hover:text-foreground">Place an order</a>
            <a href="#careers" className="text-muted-foreground hover:text-foreground">Careers</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground">Contact us</a>

            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Website <ExternalLink className="h-3 w-3" />
            </a>
          </nav>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] opacity-80">Kasese, Uganda</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              From farm to export, every step traced.
            </h1>
            <p className="mt-5 max-w-xl text-base opacity-90">
              {COMPANY_NAME}, {COMPANY_TAGLINE}, sources, processes and exports Ugandan Arabica and
              Robusta coffee — backed by full traceability, quality analysis and EUDR-ready
              documentation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <a href="#inquiry">Place an order now <ArrowRight className="ml-2 h-4 w-4" /></a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#contact">Contact us</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">Visit {COMPANY_WEBSITE}</a>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <img
              src={LOGO_URL}
              alt="Great Agro Coffee, a member of YEDA Coffee Company Limited"
              className="w-56 max-w-full rounded-xl bg-background/10 p-6 md:w-72"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-semibold">Who we are</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <p className="text-muted-foreground leading-relaxed">
            We work directly with smallholder farmers and washing stations in western Uganda,
            buying cherry and kiboko at transparent daily prices. Every delivery is weighed,
            graded and recorded against the farmer who supplied it, so quality problems and
            payments can always be traced back to source.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our Kasese facility handles hulling, grading, sorting and warehousing, while our
            quality lab certifies moisture content, defect counts and screen size before any lot
            leaves the store. Export lots ship with the geolocation and due-diligence records that
            European buyers now require.
          </p>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold">What we do</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className="rounded-lg border bg-card p-6">
                <s.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inquiry */}
      <section id="inquiry" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="text-3xl font-semibold">Inquiries &amp; orders</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Tell us what you need — green coffee contracts, a sample, supplying us with cherry or kiboko,
              or simply staying updated on our harvests and prices. Every submission is emailed straight to
              our operations desk and given a reference number you can quote.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>· Arabica &amp; Robusta green coffee, FOB and EXW</li>
              <li>· Samples and quality analysis certificates on request</li>
              <li>· EUDR due-diligence documentation with every lot</li>
            </ul>
          </div>
          <InquiryForm />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-semibold">Contact us</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Talk to us about supplying coffee, buying green coffee, or working with our team.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <Phone className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Telephone</p>
                <a href={`tel:${COMPANY_PHONE}`} className="block text-sm text-muted-foreground hover:text-foreground">{COMPANY_PHONE} · Main</a>
                <a href={`tel:${COMPANY_PHONE_OPS.replace(/\s/g, "")}`} className="block text-sm text-muted-foreground hover:text-foreground">{COMPANY_PHONE_OPS} · Operations</a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Email</p>
                <a href={`mailto:${COMPANY_EMAIL}`} className="text-sm text-muted-foreground hover:text-foreground">{COMPANY_EMAIL}</a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{COMPANY_ADDRESS}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Globe2 className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Website</p>
                <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">{COMPANY_WEBSITE}</a>
              </div>
            </li>
          </ul>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-medium">Staff sign in</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Employees of {COMPANY_NAME} can access the internal operations workspace for
              procurement, quality, finance and field teams.
            </p>
            <Button asChild className="mt-5 w-full">
              <Link to="/auth">Sign in to the workspace</Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Access is restricted to authorised staff accounts.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {COMPANY_NAME} — {COMPANY_TAGLINE}.</p>
          <p>{COMPANY_REG}</p>
        </div>
      </footer>
    </div>
  );
}