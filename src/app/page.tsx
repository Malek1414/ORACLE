import {
  Hero,
  StatContrast,
  HowItWorks,
  Logos,
  Features,
  Testimonial,
  CTAFooter,
  Footer,
} from '@/components/landing/sections';

export default function HomePage() {
  return (
    <main style={{ background: 'var(--bg)', overflowX: 'hidden' }}>
      <Hero />
      <StatContrast />
      <HowItWorks />
      <Logos />
      <Features />
      <Testimonial />
      <CTAFooter />
      <Footer />
    </main>
  );
}
