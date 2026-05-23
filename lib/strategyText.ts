/** Turn nested AI objects into editable plain text (never raw JSON in UI). */
function formatRecordAsPlainText(record: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    const label = key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      const items = value
        .map((item) => coerceStrategyText(item, ""))
        .filter(Boolean)
        .join(", ");
      if (items) lines.push(`${label}: ${items}`);
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const text = String(value).trim();
      if (text) lines.push(`${label}: ${text}`);
      continue;
    }

    if (typeof value === "object") {
      const nested = coerceStrategyText(value, "");
      if (nested) lines.push(`${label}: ${nested.replace(/\n/g, "; ")}`);
    }
  }

  return lines.join("\n");
}

/** Coerce AI JSON values to editable plain text (fixes "[object Object]" in strategy fields). */
export function coerceStrategyText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return coerceStrategyText(JSON.parse(trimmed), fallback);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => coerceStrategyText(item, "")).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["description", "summary", "theme", "label", "text", "name", "mood", "style"]) {
      if (typeof record[key] === "string" && record[key]) {
        return String(record[key]).trim();
      }
    }
    const plain = formatRecordAsPlainText(record);
    return plain || fallback;
  }
  return fallback;
}
