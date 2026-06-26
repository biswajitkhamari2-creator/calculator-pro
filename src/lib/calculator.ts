export type Operator = "+" | "-" | "×" | "÷";

export function compute(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "×": return a * b;
    case "÷":
      if (b === 0) throw new Error("Cannot divide by zero");
      return a / b;
  }
}

export function formatNumber(n: number): string {
  if (!isFinite(n)) return "Error";
  if (Number.isInteger(n) && Math.abs(n) < 1e16) return n.toLocaleString("en-US");
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e16)) return n.toExponential(6);
  // Limit to 10 significant digits
  const fixed = parseFloat(n.toPrecision(12));
  const [intPart, decPart] = String(fixed).split(".");
  const intFormatted = Number(intPart).toLocaleString("en-US");
  return decPart ? `${intFormatted}.${decPart}` : intFormatted;
}
