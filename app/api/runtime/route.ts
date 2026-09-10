import { NextResponse } from 'next/server';
import { assessRuntime } from '@/lib/runtime-control';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const decisionId = String(body.decisionId || `dec-${Date.now()}`);
    const title = String(body.title || 'Agent Control Plane Runtime Probe');
    const payload = (body.payload || {}) as Record<string, unknown>;

    return NextResponse.json({ assessment: assessRuntime(decisionId, title, payload) });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during runtime probe';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
