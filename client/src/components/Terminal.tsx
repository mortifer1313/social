import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TerminalLine {
  id: number;
  type: "input" | "output" | "error" | "success";
  content: string;
}

interface TerminalProps {
  onCommand: (cmd: string) => { output: string; error: boolean };
  welcomeMessage?: string;
}

export default function Terminal({ onCommand, welcomeMessage }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    if (welcomeMessage) {
      setLines([{ id: idCounter.current++, type: "output", content: welcomeMessage }]);
    }
  }, [welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const focusInput = () => inputRef.current?.focus();

  const executeCommand = (cmd: string) => {
    if (!cmd.trim()) return;

    const inputLine: TerminalLine = {
      id: idCounter.current++,
      type: "input",
      content: `$ ${cmd}`,
    };

    const result = onCommand(cmd);
    const outputLine: TerminalLine = {
      id: idCounter.current++,
      type: result.error ? "error" : "success",
      content: result.output,
    };

    setLines((prev) => [...prev, inputLine, outputLine]);
    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setCurrentInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(currentInput);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentInput(history[history.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(history[history.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setCurrentInput("");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input":
        return "text-chart-1";
      case "error":
        return "text-destructive";
      case "success":
        return "text-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-card rounded-lg border border-border overflow-hidden"
      onClick={focusInput}
      data-testid="terminal-container"
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-chart-4/60" />
          <div className="w-3 h-3 rounded-full bg-primary/60" />
        </div>
        <span className="text-sm text-muted-foreground font-medium ml-2">
          Social Media Grower Terminal
        </span>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="font-mono text-sm space-y-1">
          {lines.map((line) => (
            <pre
              key={line.id}
              className={`whitespace-pre-wrap ${getLineColor(line.type)}`}
            >
              {line.content}
            </pre>
          ))}
          <div className="flex items-center">
            <span className="text-primary mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-foreground font-mono"
              autoFocus
              spellCheck={false}
              data-testid="input-command"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
