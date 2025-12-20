import CommandCard from '../CommandCard';

export default function CommandCardExample() {
  return (
    <div className="space-y-3 max-w-md">
      <CommandCard
        command="comment <platform> <n>"
        description="Post n comments on the specified platform"
        category="commenting"
        example="comment instagram 10"
      />
      <CommandCard
        command="start <platform>"
        description="Start the bot for a specific platform"
        category="bot"
        example="start tiktok"
      />
    </div>
  );
}
