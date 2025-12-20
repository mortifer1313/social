import PlatformCard from '../PlatformCard';

export default function PlatformCardExample() {
  return (
    <div className="max-w-sm">
      <PlatformCard
        platform="instagram"
        isActive={true}
        onToggle={() => console.log("toggle")}
        commentsToday={45}
        dailyLimit={150}
        onPostComments={() => console.log("post")}
        onGenerateSamples={() => console.log("generate")}
      />
    </div>
  );
}
