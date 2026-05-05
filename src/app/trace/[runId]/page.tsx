import fs from "fs"
import path from "path"

const C = {
  bg: "#0a0f1a",
  wire: "#2a3a55",
  tint: "#141e2e",
  row: "rgba(26,39,64,0.35)",
  lbl: "#64748b",
  val: "#f1f5f9",
  hi: "#f1f5f9",
  olive: "#7c8c6a",
  amber: "#c9956a",
  slate: "#8b9fc7",
  coral: "#c9726a",
  lavender: "#9b8ab8",
}

export default async function TracePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const tracesDir = path.join(process.cwd(), "data", "traces")
  const files = fs.readdirSync(tracesDir)
  const matching = files.filter(
    (f) => f.startsWith(`cognitive-trace-${runId}`) && f.endsWith(".json")
  )

  if (matching.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-sm" style={{ color: C.coral }}>No trace found for {runId}</div>
      </div>
    )
  }

  const tracePath = path.join(tracesDir, matching[0])
  const trace = JSON.parse(fs.readFileSync(tracePath, "utf-8"))

  const dirColors: Record<string, string> = { ACCELERATION: C.olive, DECELERATION: C.coral, AMBIGUOUS: C.slate, CONTRADICTORY: C.lavender }
  const outcomeColors: Record<string, string> = { SURVIVED: C.olive, REJECTED: C.coral, FLAGGED: C.amber, STRIPPED: C.lavender, PRUNED: C.slate }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="py-6 px-6" style={{ borderBottom: `1px solid ${C.wire}` }}>
        <div style={{ maxWidth: 900, marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-[9px] tracking-[3px] font-bold" style={{ color: C.amber }}>x402 VERIFIED · COGNITIVE TRACE</div>
          <h1 className="text-lg font-bold mt-1" style={{ color: C.hi }}>
            Run {runId} · {trace._signal_count} signals · {Object.entries(trace._outcomes as Record<string, number>).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(" · ")}
          </h1>
          <div className="text-[10px] mt-1" style={{ color: C.lbl }}>
            Assembled {new Date(trace._assembled_at).toLocaleString()} · This trace was accessed via x402 micropayment on Base Sepolia
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, marginLeft: "auto", marginRight: "auto", padding: "32px 24px" }}>
        {(trace.signals as any[]).map((sig: any, i: number) => {
          const p = sig.perception
          const j = sig.judgment?.final_signal_matrix
          const signalId = sig.signal_ids?.[0] || ""
          const traceUrl = signalId ? `https://integrity-protocol.github.io/Overwatch-Terminal/trace.html?signal_id=${signalId}` : ""
          const totalViolations = (sig.perception_gate?.violations?.length || 0) + (sig.contextualization_gate?.violations?.length || 0) + (sig.inference_gate?.violations?.length || 0) + (sig.judgment_gate?.violations?.length || 0)
          const dirColor = dirColors[p.direction] || C.slate
          const outcomeColor = outcomeColors[sig.outcome] || C.lbl

          return (
            <div key={i} className="mb-4 p-5" style={{ background: C.tint, border: `1px solid ${C.wire}`, borderRadius: 8 }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold font-mono" style={{ color: C.amber }}>SIG-{String(i + 1).padStart(3, "0")}</span>
                <span className="text-[10px] tracking-[1px] font-bold px-2 py-0.5" style={{ color: dirColor, border: `1px solid ${dirColor}40`, borderRadius: 4 }}>{p.direction}</span>
                <span className="text-[10px]" style={{ color: C.lbl }}>{p.category}</span>
                <div className="ml-auto flex items-center gap-2">
                  {j && <span className="text-sm font-bold font-mono" style={{ color: C.amber }}>{j.final_composite}</span>}
                  <span className="text-[10px] tracking-[1px] font-bold px-2 py-0.5" style={{ color: outcomeColor, background: outcomeColor + "15", borderRadius: 4 }}>{sig.outcome}</span>
                </div>
              </div>
              <div className="text-base font-semibold mb-2" style={{ color: C.hi }}>{p.signal}</div>
              <div className="text-sm leading-relaxed mb-3" style={{ color: C.lbl }}>{p.description}</div>
              <div className="flex flex-wrap gap-4 mb-3 pt-3" style={{ borderTop: `1px solid ${C.row}` }}>
                <div><div className="text-[9px] tracking-[1px] font-bold" style={{ color: C.lbl }}>CONFIDENCE</div><div className="text-sm font-semibold" style={{ color: C.val }}>{p.confidence}</div></div>
                <div><div className="text-[9px] tracking-[1px] font-bold" style={{ color: C.lbl }}>SEVERITY</div><div className="text-sm font-semibold" style={{ color: C.val }}>{p.severity}</div></div>
                <div><div className="text-[9px] tracking-[1px] font-bold" style={{ color: C.lbl }}>VIOLATIONS</div><div className="text-sm font-semibold" style={{ color: totalViolations > 0 ? C.coral : C.val }}>{totalViolations}</div></div>
                {sig.corrections_applied?.length > 0 && <div><div className="text-[9px] tracking-[1px] font-bold" style={{ color: C.lbl }}>CORRECTIONS</div><div className="text-sm font-semibold" style={{ color: C.lavender }}>{sig.corrections_applied.length}</div></div>}
              </div>
              {traceUrl && <a href={traceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold tracking-[1px]" style={{ color: C.amber, textDecoration: "none" }}>VIEW FULL COGNITIVE TRACE ↗</a>}
            </div>
          )
        })}

        <div className="py-4 mt-8 text-center" style={{ borderTop: `1px solid ${C.wire}` }}>
          <a href="/" className="text-xs font-bold tracking-[1px]" style={{ color: C.amber, textDecoration: "none" }}>← BACK TO DASHBOARD</a>
        </div>
      </div>
    </div>
  )
}
