// Keep CLI diagnostics finite, single-line, and limited to error metadata.
// Never dump stacks or arbitrary properties from filesystem errors.
export function formatPhotoError(error: unknown): string {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  const field = (value: string) => value.slice(0, 240).replace(/[\x00-\x1f\x7f-\x9f]/g, " ") + (value.length > 240 ? "…" : "");
  function visit(value: unknown) {
    if (seen.has(value) || seen.size >= 6) return;
    seen.add(value);
    if (!(value instanceof Error)) {
      parts.push(typeof value === "string" ? field(value) : "Unknown error");
      return;
    }
    const details = value as NodeJS.ErrnoException & { dest?: string };
    const metadata = ["code", "syscall", "path", "dest"] as const;
    parts.push([
      field(value.message),
      ...metadata.flatMap((key) => typeof details[key] === "string" ? [`${key}=${field(details[key])}`] : []),
    ].join(" "));
    if (value.cause !== undefined) visit(value.cause);
    if (value instanceof AggregateError) {
      for (const child of value.errors) {
        if (seen.size >= 6) break;
        visit(child);
      }
    }
  }
  visit(error);
  const diagnostic = parts.join("; caused by: ");
  return diagnostic.length > 4096 ? diagnostic.slice(0, 4095) + "…" : diagnostic;
}
