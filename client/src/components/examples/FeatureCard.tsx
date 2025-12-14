import FeatureCard from '../FeatureCard';

export default function FeatureCardExample() {
  return (
    <div className="max-w-sm">
      <FeatureCard
        icon="🤖"
        title="Multi-Platform Automation"
        description="Automated commenting across Instagram, Facebook, and TikTok"
        stats="200+ Templates"
        tags={["Instagram", "Facebook", "TikTok"]}
      />
    </div>
  );
}
