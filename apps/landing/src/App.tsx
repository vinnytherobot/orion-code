import { GrainOverlay } from '@/components/effects/GrainOverlay';
import { ScrollProgress } from '@/components/effects/ScrollProgress';
import { WaveDivider } from '@/components/effects/WaveDivider';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Agents } from '@/components/sections/Agents';
import { Architecture } from '@/components/sections/Architecture';
import { CTA } from '@/components/sections/CTA';
import { Features } from '@/components/sections/Features';
import { Hero } from '@/components/sections/Hero';
import { Providers } from '@/components/sections/Providers';
import { QuickStart } from '@/components/sections/QuickStart';
import { Showcase } from '@/components/sections/Showcase';
import { Stats } from '@/components/sections/Stats';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <ScrollProgress />
      <GrainOverlay />
      <div className="flex min-h-screen flex-col bg-background w-full max-w-full">
        <Navbar />
        <main className="flex-1">
          <Hero />
          <WaveDivider />
          <QuickStart />
          <WaveDivider flip />
          <Features />
          <WaveDivider />
          <Architecture />
          <WaveDivider flip />
          <Agents />
          <WaveDivider />
          <Providers />
          <WaveDivider flip />
          <Showcase />
          <WaveDivider />
          <Stats />
          <WaveDivider flip />
          <CTA />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
