import BuildPhaseTimeline from '../BuildPhaseTimeline';

const mockPhases = [
  {
    number: 1,
    title: "Foundation",
    description: "Core bot infrastructure setup",
    items: ["Selenium setup", "Platform detection", "Basic commenting"],
  },
  {
    number: 2,
    title: "Intelligence",
    description: "Smart commenting engine",
    items: ["200+ templates", "Emotional categories", "Context awareness"],
  },
];

export default function BuildPhaseTimelineExample() {
  return <BuildPhaseTimeline phases={mockPhases} />;
}
