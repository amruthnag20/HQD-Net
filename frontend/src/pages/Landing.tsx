import { LandingNav } from '@/components/landing/LandingNav'
import { HeroArchitectureFlow } from '@/components/landing/HeroArchitectureFlow'
import { EvidenceSection } from '@/components/landing/EvidenceSection'
import { FinalCta } from '@/components/landing/FinalCta'
import { LandingFooter } from '@/components/landing/LandingFooter'

/**
 * Landing — public-facing root.
 * Page structure: Nav → Hero+Architecture (continuous) → Evidence → CTA → Footer
 */
export function Landing() {
  return (
    <div className="relative">
      <LandingNav />
      <main id="main-content">
        <HeroArchitectureFlow />
        <EvidenceSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
