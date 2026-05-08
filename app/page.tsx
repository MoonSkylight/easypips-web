function buildDeskSignal(
  signal: SignalLike | null,
  desk: "RANO" | "FAHDI"
): {
  side: "LONG" | "SHORT";
  entry?: number;
  stopLoss?: number;
  target?: number;
  note: string;
  time: string;
} {
  const side: "LONG" | "SHORT" =
    getTradeSide(signal) === "SHORT" ? "SHORT" : "LONG";

  const entry = getSimpleEntry(signal);
  const stop = getSimpleStop(signal);
  const target = getSimpleTarget(signal);

  return {
    side,
    entry: typeof entry === "number" ? entry : undefined,
    stopLoss: typeof stop === "number" ? stop : undefined,
    target: typeof target === "number" ? target : undefined,
    note:
      desk === "RANO"
        ? "Patient entry, disciplined stop, and one clean target."
        : "Daily tactical execution with one entry, one stop, and one target.",
    time: signal?.published_at
      ? new Date(signal.published_at).toLocaleString()
      : new Date().toLocaleString(),
  };
}