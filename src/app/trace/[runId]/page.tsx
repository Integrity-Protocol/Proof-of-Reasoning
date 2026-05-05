"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { createWalletClient, createPublicClient, custom, http } from "viem"
import { baseSepolia } from "viem/chains"
import type { ClientEvmSigner } from "@x402/evm"
import { ExactEvmScheme } from "@x402/evm/exact/client"
import { x402Client } from "@x402/fetch"
import { wrapFetchWithPayment } from "@x402/fetch"

const C = {
  bg: "#0a0f1a",
  wire: "#2a3a55",
  tint: "#1a2538",
  row: "rgba(26,39,64,0.35)",
  lbl: "#8b9bb5",
  val: "#f1f5f9",
  hi: "#f1f5f9",
  olive: "#7c8c6a",
  amber: "#c9956a",
  slate: "#8b9fc7",
  coral: "#c9726a",
  lavender: "#a78bfa",
}

const dirColors: Record<string, string> = {
  ACCELERATION: C.olive,
  DECELERATION: C.coral,
  AMBIGUOUS: C.slate,
  CONTRADICTORY: C.lavender,
}

const outcomeColors: Record<string, string> = {
  SURVIVED: C.olive,
  REJECTED: C.coral,
  FLAGGED: C.amber,
  STRIPPED: C.lavender,
  PRUNED: C.slate,
}

export default function TracePage() {
  const params = useParams()
  const runId = params.runId as string
  const [trace, setTrace] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  const handleAccess = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setError("No wallet detected. Install MetaMask to access cognitive traces.")
      return
    }

    setPaying(true)
    setError(null)

    try {
      const provider = (window as any).ethereum
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as `0x${string}`[]
      const addr = accounts[0]

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x14a34" }],
        })
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x14a34",
              chainName: "Base Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            }],
          })
        } else {
          throw switchErr
        }
      }

      const walletClient = createWalletClient({
        account: addr,
        chain: baseSepolia,
        transport: custom(provider),
      })

      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      })

      const signer: ClientEvmSigner = {
        address: addr,
        signTypedData: (message) =>
          walletClient.signTypedData({
            account: addr,
            domain: message.domain as any,
            types: message.types as any,
            primaryType: message.primaryType as any,
            message: message.message as any,
          }),
        readContract: (args) =>
          publicClient.readContract({
            address: args.address,
            abi: args.abi as any,
            functionName: args.functionName,
            args: args.args as any,
          }),
      }

      const client = new x402Client()
      client.register("eip155:84532", new ExactEvmScheme(signer))
      const paidFetch = wrapFetchWithPayment(fetch, client)

      const res = await paidFetch(`/api/por/trace/${runId}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || `Failed to load trace (${res.status})`)
        setPaying(false)
        return
      }

      const data = await res.json()
      setTrace(data)
    } catch (e: any) {
      console.error("x402 payment error:", e)
      if (e.code === 4001) {
        setError("Payment rejected by wallet.")
      } else {
        setError(e.message || "Payment failed. Please try again.")
      }
    } finally {
      setPaying(false)
    }
  }, [runId])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-sm" style={{ color: C.lbl }}>Initializing...</div>
      </div>
    )
  }

  // Payment gate screen
  if (!trace && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-center" style={{ maxWidth: 440 }}>
          <div className="text-[10px] tracking-[3px] font-bold mb-4" style={{ color: C.amber }}>x402 VERIFIED ACCESS</div>
          <div className="text-lg font-bold mb-2" style={{ color: C.hi }}>Cognitive Trace — Run {runId}</div>
          <div className="text-sm mb-6 leading-relaxed" style={{ color: C.lbl }}>
            Full reasoning audit for this pipeline run is secured by x402 micropayment on Base Sepolia. 
            Payment is logged on-chain as proof of access.
          </div>
          <div className="text-xs mb-6" style={{ color: C.lbl }}>
            Cost: <span style={{ color: C.amber, fontWeight: 700 }}>$0.001 USDC</span> · Network: Base Sepolia
          </div>
          {error && (
            <div className="text-sm mb-4 p-3" style={{ color: C.coral, background: C.coral + "10", borderRadius: 6 }}>{error}</div>
          )}
          <button
            onClick={handleAccess}
            disabled={paying}
            style={{
              background: paying ? C.wire : C.amber,
              color: C.bg,
              border: "none",
              padding: "12px 32px",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1,
              cursor: paying ? "wait" : "pointer",
              opacity: paying ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {paying ? "CONNECTING WALLET..." : "PAY & ACCESS TRACE"}
          </button>
          <div className="mt-8">
            <a href="/" className="text-xs font-bold tracking-[1px]" style={{ color: C.amber, textDecoration: "none" }}>← BACK TO DASHBOARD</a>
          </div>
        </div>
      </div>
    )
  }

  // Compute run-level violation totals (violations are run-level, not signal-level)
  const firstSig = trace.signals?.[0]
  const runViolations = firstSig ? {
    perception: firstSig.perception_gate?.violations?.length || 0,
    contextualization: firstSig.contextualization_gate?.violations?.length || 0,
    inference: firstSig.inference_gate?.violations?.length || 0,
    judgment: firstSig.judgment_gate?.violations?.length || 0,
  } : { perception: 0, contextualization: 0, inference: 0, judgment: 0 }
  const totalRunViolations = runViolations.perception + runViolations.contextualization + runViolations.inference + runViolations.judgment

  // Trace loaded — render it
  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* Header */}
      <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.wire}` }}>
        <div style={{ maxWidth: 900, marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-[10px] tracking-[3px] font-bold" style={{ color: C.amber }}>x402 VERIFIED · COGNITIVE TRACE</div>
          <h1 className="text-lg font-bold mt-1" style={{ color: C.hi }}>
            Run {runId} · {trace._signal_count} signals · {Object.entries(trace._outcomes as Record<string, number>).filter(([, v]: any) => v > 0).map(([k, v]: any) => `${v} ${k}`).join(" · ")}
          </h1>
          <div className="text-[11px] mt-1" style={{ color: C.lbl }}>
            Assembled {new Date(trace._assembled_at).toLocaleString()} · This trace was accessed via x402 micropayment on Base Sepolia
          </div>
        </div>
      </div>

      {/* Run-level violation summary */}
      <div style={{ maxWidth: 900, marginLeft: "auto", marginRight: "auto", padding: "20px 28px 0" }}>
        <div style={{ padding: "16px 20px", background: C.tint, border: `1px solid ${C.amber}`, borderRadius: 4, marginBottom: 24 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[2px] font-bold" style={{ color: C.amber }}>GATE VIOLATIONS THIS RUN</div>
            <div className="text-lg font-bold font-mono" style={{ color: totalRunViolations > 0 ? C.coral : C.val }}>{totalRunViolations}</div>
          </div>
          <div className="flex gap-6">
            {Object.entries(runViolations).map(([gate, count]) => (
              <div key={gate} className="flex items-center gap-2">
                <span className="text-[10px] tracking-[1px] font-semibold" style={{ color: C.lbl }}>{gate.toUpperCase()}</span>
                <span className="text-[12px] font-bold font-mono" style={{ color: count > 0 ? C.coral : C.val }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signal cards */}
      <div style={{ maxWidth: 900, marginLeft: "auto", marginRight: "auto", padding: "0 28px 36px" }}>
        {(trace.signals as any[]).map((sig: any, i: number) => {
          const p = sig.perception
          const j = sig.judgment?.final_signal_matrix
          const signalId = sig.signal_ids?.[0] || ""
          const traceUrl = signalId ? `https://integrity-protocol.github.io/Overwatch-Terminal/trace.html?signal_id=${signalId}` : ""
          const dirColor = dirColors[p.direction] || C.slate
          const outcomeColor = outcomeColors[sig.outcome] || C.lbl

          return (
            <div key={i} style={{ background: C.tint, border: `1px solid ${C.amber}`, borderRadius: 4, padding: "20px 24px", marginBottom: 16 }}>
              {/* Signal header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold font-mono" style={{ color: C.amber }}>SIG-{String(i + 1).padStart(3, "0")}</span>
                <span className="text-[10px] tracking-[1px] font-bold px-2 py-0.5" style={{ color: dirColor, border: `1px solid ${dirColor}40`, borderRadius: 4 }}>{p.direction}</span>
                <span className="text-[11px]" style={{ color: C.lbl }}>{p.category}</span>
                <div className="ml-auto flex items-center gap-2">
                  {j && <span className="text-sm font-bold font-mono" style={{ color: C.amber }}>{j.final_composite}</span>}
                  <span className="text-[10px] tracking-[1px] font-bold px-2 py-0.5" style={{ color: outcomeColor, background: outcomeColor + "15", borderRadius: 4 }}>{sig.outcome}</span>
                </div>
              </div>

              {/* Signal content */}
              <div className="text-[15px] font-semibold mb-2" style={{ color: C.hi }}>{p.signal}</div>
              <div className="text-[13px] leading-relaxed mb-4" style={{ color: "#94a3b8" }}>{p.description}</div>

              {/* Signal metrics */}
              <div className="flex flex-wrap gap-6 pt-3" style={{ borderTop: `1px solid ${C.row}` }}>
                <div>
                  <div className="text-[10px] tracking-[1px] font-bold" style={{ color: C.lbl }}>CONFIDENCE</div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: C.val }}>{p.confidence}</div>
                </div>
                <div>
                  <div className="text-[10px] tracking-[1px] font-bold" style={{ color: C.lbl }}>SEVERITY</div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: C.val }}>{p.severity}</div>
                </div>
                {sig.corrections_applied?.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[1px] font-bold" style={{ color: C.lbl }}>CORRECTIONS</div>
                    <div className="text-sm font-semibold mt-0.5" style={{ color: C.lavender }}>{sig.corrections_applied.length}</div>
                  </div>
                )}
                {traceUrl && (
                  <div className="ml-auto self-end">
                    <a href={traceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold tracking-[1px]" style={{ color: C.amber, textDecoration: "none" }}>
                      VIEW FULL COGNITIVE TRACE ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div className="py-6 mt-8 text-center" style={{ borderTop: `1px solid ${C.wire}` }}>
          <a href="/" className="text-xs font-bold tracking-[1px]" style={{ color: C.amber, textDecoration: "none" }}>← BACK TO DASHBOARD</a>
        </div>
      </div>
    </div>
  )
}
