interface SectionHeaderProps {
  icon: string;
  title: string;
  description: string;
}

export default function SectionHeader({ icon, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
        <span className="text-2xl">{icon}</span>
        {title}
      </h2>
      <p className="text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
