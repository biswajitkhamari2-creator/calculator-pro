import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Delete, History, Moon, Sun, Trash2, FlaskConical, Check } from "lucide-react";
import { compute, formatNumber, type Operator } from "@/lib/calculator";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

const HISTORY_KEY = "calc-history";
const MEM_KEY = "calc-memory";



export default function Calculator() {
  const { theme, toggle } = useTheme();

  const [display, setDisplay] = useState("0");
  const [previous, setPrevious] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForNew, setWaitingForNew] = useState(false);
  const [expression, setExpression] = useState("");
  const [error, setError] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [memory, setMemory] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [scientific, setScientific] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load persisted state
  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
      const m = localStorage.getItem(MEM_KEY);
      if (m) setMemory(parseFloat(m) || 0);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(MEM_KEY, String(memory));
  }, [memory]);

  const currentValue = useMemo(() => parseFloat(display.replace(/,/g, "")) || 0, [display]);

  const reset = useCallback(() => {
    setDisplay("0");
    setPrevious(null);
    setOperator(null);
    setWaitingForNew(false);
    setExpression("");
    setError(false);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay("0");
    setError(false);
  }, []);

  const inputDigit = useCallback((d: string) => {
    // Fresh start after an error or when awaiting a new operand
    if (error || waitingForNew) {
      setDisplay(d);
      setWaitingForNew(false);
      setError(false);
      return;
    }
    setDisplay((prev) => {
      const raw = prev.replace(/,/g, "");
      if (raw === "0") return d;
      if (raw.replace(/[^\d]/g, "").length >= 15) return prev;
      const next = raw + d;
      const [i, dec] = next.split(".");
      const intF = Number(i).toLocaleString("en-US");
      return dec !== undefined ? `${intF}.${dec}` : intF;
    });
  }, [waitingForNew, error]);

  const inputDecimal = useCallback(() => {
    setError(false);
    if (waitingForNew) {
      setDisplay("0.");
      setWaitingForNew(false);
      return;
    }
    setDisplay((prev) => (prev.includes(".") ? prev : prev + "."));
  }, [waitingForNew]);

  const backspace = useCallback(() => {
    if (waitingForNew || error) return;
    setDisplay((prev) => {
      const raw = prev.replace(/,/g, "");
      if (raw.length <= 1 || (raw.length === 2 && raw.startsWith("-"))) return "0";
      const next = raw.slice(0, -1);
      const [i, dec] = next.split(".");
      const intF = Number(i).toLocaleString("en-US");
      return dec !== undefined ? `${intF}.${dec}` : intF;
    });
  }, [waitingForNew, error]);

  const toggleSign = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "0" || prev === "Error") return prev;
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  }, []);

  const applyPercent = useCallback(() => {
    setDisplay((prev) => formatNumber(parseFloat(prev.replace(/,/g, "")) / 100));
    setWaitingForNew(true);
  }, []);

  const performOperation = useCallback((nextOp: Operator) => {
    if (error) return; // Force user to AC before starting a new operation
    setError(false);
    if (previous === null) {
      setPrevious(currentValue);
    } else if (operator && !waitingForNew) {
      try {
        const result = compute(previous, currentValue, operator);
        setPrevious(result);
        setDisplay(formatNumber(result));
      } catch (e) {
        setDisplay("Error");
        setError(true);
        setPrevious(null);
        setOperator(null);
        setExpression("");
        return;
      }
    }
    setExpression(`${formatNumber(previous ?? currentValue)} ${nextOp}`);
    setOperator(nextOp);
    setWaitingForNew(true);
  }, [currentValue, operator, previous, waitingForNew]);

  const equals = useCallback(() => {
    if (operator === null || previous === null) return;
    try {
      const result = compute(previous, currentValue, operator);
      const expr = `${formatNumber(previous)} ${operator} ${formatNumber(currentValue)}`;
      const resStr = formatNumber(result);
      setDisplay(resStr);
      setExpression(`${expr} =`);
      setPrevious(null);
      setOperator(null);
      setWaitingForNew(true);
      setHistory((h) => [
        { id: crypto.randomUUID(), expression: expr, result: resStr, timestamp: Date.now() },
        ...h,
      ].slice(0, 50));
    } catch (e) {
      setDisplay("Error");
      setError(true);
      setPrevious(null);
      setOperator(null);
      setExpression("");
    }
  }, [currentValue, operator, previous]);

  const scientificOp = useCallback((kind: "sqrt" | "sqr" | "inv") => {
    setError(false);
    try {
      let r: number;
      if (kind === "sqrt") {
        if (currentValue < 0) throw new Error("Invalid");
        r = Math.sqrt(currentValue);
      } else if (kind === "sqr") {
        r = currentValue * currentValue;
      } else {
        if (currentValue === 0) throw new Error("Div by zero");
        r = 1 / currentValue;
      }
      setDisplay(formatNumber(r));
      setWaitingForNew(true);
    } catch {
      setDisplay("Error");
      setError(true);
    }
  }, [currentValue]);

  // Memory
  const memAdd = () => setMemory((m) => m + currentValue);
  const memSub = () => setMemory((m) => m - currentValue);
  const memRecall = () => { setDisplay(formatNumber(memory)); setWaitingForNew(true); };
  const memClear = () => setMemory(0);

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key;
      if (k >= "0" && k <= "9") { inputDigit(k); return; }
      if (k === ".") { inputDecimal(); return; }
      if (k === "+" || k === "-") { performOperation(k as Operator); return; }
      if (k === "*") { performOperation("×"); return; }
      if (k === "/") { e.preventDefault(); performOperation("÷"); return; }
      if (k === "Enter" || k === "=") { e.preventDefault(); equals(); return; }
      if (k === "Backspace") { backspace(); return; }
      if (k === "Escape") { reset(); return; }
      if (k === "%") { applyPercent(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inputDigit, inputDecimal, performOperation, equals, backspace, reset, applyPercent]);

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:py-10 flex items-start justify-center">
      <div className="w-full max-w-6xl grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        {/* Calculator card */}
        <div className="glass-panel rounded-3xl p-5 sm:p-7 animate-fade-in">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground font-bold shadow-md">
                =
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Calculator</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <IconBtn label="Scientific mode" active={scientific} onClick={() => setScientific((s) => !s)}>
                <FlaskConical className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="History" active={showHistory} onClick={() => setShowHistory((s) => !s)}>
                <History className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Toggle theme" onClick={toggle}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </IconBtn>
            </div>
          </div>

          {/* Display */}
          <div
            className="rounded-2xl bg-gradient-to-b from-background/60 to-background/30 border border-border/50 px-5 py-6 mb-5 text-right overflow-hidden"
            aria-live="polite"
          >
            <div className="text-sm text-muted-foreground h-5 truncate font-mono">
              {expression || (memory !== 0 ? `M = ${formatNumber(memory)}` : "\u00A0")}
            </div>
            <div className="flex items-end justify-end gap-3 mt-1">
              <button
                onClick={copyResult}
                aria-label="Copy result"
                className="opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
              <div
                className={cn(
                  "font-display font-light tracking-tight tabular-nums break-all",
                  "text-5xl sm:text-6xl md:text-7xl leading-none",
                  error && "text-destructive"
                )}
              >
                {display}
              </div>
            </div>
          </div>

          {/* Memory row */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <MemKey onClick={memClear}>MC</MemKey>
            <MemKey onClick={memRecall}>MR</MemKey>
            <MemKey onClick={memAdd}>M+</MemKey>
            <MemKey onClick={memSub}>M−</MemKey>
          </div>

          {/* Scientific row */}
          {scientific && (
            <div className="grid grid-cols-4 gap-2 mb-3 animate-fade-in">
              <MemKey onClick={() => scientificOp("sqr")}>x²</MemKey>
              <MemKey onClick={() => scientificOp("sqrt")}>√x</MemKey>
              <MemKey onClick={() => scientificOp("inv")}>1/x</MemKey>
              <MemKey onClick={toggleSign}>+/−</MemKey>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <Key variant="muted" onClick={reset} label="All clear">AC</Key>
            <Key variant="muted" onClick={clearEntry} label="Clear entry">C</Key>
            <Key variant="muted" onClick={backspace} label="Backspace">
              <Delete className="h-5 w-5 mx-auto" />
            </Key>
            <Key variant="op" onClick={() => performOperation("÷")} active={operator === "÷"} label="Divide">÷</Key>

            <Key onClick={() => inputDigit("7")}>7</Key>
            <Key onClick={() => inputDigit("8")}>8</Key>
            <Key onClick={() => inputDigit("9")}>9</Key>
            <Key variant="op" onClick={() => performOperation("×")} active={operator === "×"} label="Multiply">×</Key>

            <Key onClick={() => inputDigit("4")}>4</Key>
            <Key onClick={() => inputDigit("5")}>5</Key>
            <Key onClick={() => inputDigit("6")}>6</Key>
            <Key variant="op" onClick={() => performOperation("-")} active={operator === "-"} label="Subtract">−</Key>

            <Key onClick={() => inputDigit("1")}>1</Key>
            <Key onClick={() => inputDigit("2")}>2</Key>
            <Key onClick={() => inputDigit("3")}>3</Key>
            <Key variant="op" onClick={() => performOperation("+")} active={operator === "+"} label="Add">+</Key>

            <Key onClick={applyPercent} label="Percent">%</Key>
            <Key onClick={() => inputDigit("0")}>0</Key>
            <Key onClick={inputDecimal} label="Decimal">.</Key>
            <Key variant="accent" onClick={equals} label="Equals">=</Key>
          </div>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            Tip: use your keyboard — numbers, + − × ÷, Enter, Backspace, Esc
          </p>
        </div>

        {/* History panel */}
        <aside
          className={cn(
            "glass-panel rounded-3xl p-5 transition-all",
            showHistory ? "block animate-fade-in" : "hidden lg:block"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">History</h2>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                aria-label="Clear history"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No calculations yet. Your history will appear here.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="group rounded-xl p-3 bg-background/40 hover:bg-background/70 border border-border/50 cursor-pointer transition-colors"
                  onClick={() => { setDisplay(h.result); setWaitingForNew(true); setError(false); }}
                >
                  <div className="text-xs text-muted-foreground font-mono truncate">{h.expression}</div>
                  <div className="text-lg font-medium tabular-nums truncate">= {h.result}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(h.timestamp).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

/* --- Subcomponents --- */

function Key({
  children,
  onClick,
  variant = "default",
  active = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "muted" | "op" | "accent";
  active?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "calc-key rounded-2xl h-16 sm:h-[4.5rem] text-2xl sm:text-3xl font-medium select-none",
        variant === "muted" && "bg-key-muted text-key-muted-foreground",
        variant === "op" && "bg-key-op text-key-op-foreground",
        variant === "accent" && "bg-key-accent text-key-accent-foreground",
        active && "ring-2 ring-offset-2 ring-offset-card ring-key-accent"
      )}
    >
      {children}
    </button>
  );
}

function MemKey({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="calc-key rounded-xl h-10 text-sm font-medium bg-background/40 text-foreground/80"
    >
      {children}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "h-9 w-9 grid place-items-center rounded-xl border border-border/50 transition-colors",
        "hover:bg-accent",
        active ? "bg-primary text-primary-foreground border-transparent" : "bg-background/40"
      )}
    >
      {children}
    </button>
  );
}
