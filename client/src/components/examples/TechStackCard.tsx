import TechStackCard from '../TechStackCard';

export default function TechStackCardExample() {
  return (
    <TechStackCard
      category="Backend"
      icon="🐍"
      items={[
        { name: "Python 3.11", description: "Core programming language" },
        { name: "Flask 3.0", description: "Web framework" },
        { name: "Selenium", description: "Browser automation" },
      ]}
    />
  );
}
