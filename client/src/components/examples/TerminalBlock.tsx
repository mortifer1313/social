import TerminalBlock from '../TerminalBlock';

export default function TerminalBlockExample() {
  return (
    <TerminalBlock title="terminal" language="bash">
{`$ start instagram
Bot is now active and ready for commands

$ comment instagram 10
Starting comment campaign on instagram
Target: 10 comments
Estimated time: 20 minutes`}
    </TerminalBlock>
  );
}
