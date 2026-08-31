import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LOGO_URL, COMPANY_NAME, COMPANY_TAGLINE } from "@/utils/companyBrand";
import CareersSection from "@/components/landing/CareersSection";

export default function Careers() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img src={LOGO_URL} alt={`${COMPANY_NAME} logo`} className="h-10 w-10 rounded object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide truncate">{COMPANY_NAME}</p>
              <p className="text-[11px] text-muted-foreground truncate">{COMPANY_TAGLINE}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back to home</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <CareersSection />
      </main>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
      </footer>
    </div>
  );
}
