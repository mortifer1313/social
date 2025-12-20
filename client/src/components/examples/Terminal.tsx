import Terminal from '../Terminal';

export default function TerminalExample() {
  const handleCommand = (cmd: string) => {
    if (cmd === "help") {
      return { output: "Available commands: help, status, start, stop", error: false };
    }
    return { output: `Unknown command: ${cmd}`, error: true };
  };

  return (
    <div className="h-80">
      <Terminal onCommand={handleCommand} welcomeMessage="Type 'help' to get started" />
    </div>
  );
}
