import './HomePage.css';
import HeroSection from '../components/home/HeroSection';
import ArchOverview from '../components/home/ArchOverview';
import ListPrimitive from '../components/home/ListPrimitive';
import CreampieSection from '../components/home/CreampieSection';
import RelationshipSection from '../components/home/RelationshipSection';
import RenderingSection from '../components/home/RenderingSection';
import RealCodeSection from '../components/home/RealCodeSection';

type Page = 'home' | 'course' | 'glossary';

interface Props { setPage: (p: Page) => void; }

export default function HomePage({ setPage }: Props) {
  return (
    <div>
      {/* Hero is full-bleed — no container constraint */}
      <div className="home__hero-wrapper">
        <HeroSection setPage={setPage} />
      </div>
      {/* All other sections are constrained */}
      <div className="home__content">
        <ArchOverview />
        <ListPrimitive />
        <CreampieSection />
        <RelationshipSection />
        <RenderingSection />
        <RealCodeSection />
      </div>
    </div>
  );
}
