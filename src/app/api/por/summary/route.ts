import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), "data", "gate-violation-summary.json")
    const raw = fs.readFileSync(dataPath, "utf-8")
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to load summary data", detail: e.message },
      { status: 500 }
    )
  }
}
