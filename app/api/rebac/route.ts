import { NextResponse } from 'next/server';
import { rebacEngine } from '@/lib/rebac-engine';

export async function GET() {
  return NextResponse.json({
    tuples: rebacEngine.getTuples(),
    schema: `definition user {}
definition control_plane_resource {
    relation viewer: user
    relation editor: user
    relation executor: user
    relation council_auditor: user

    permission view = viewer + editor + executor
    permission edit = editor
    permission execute = executor & council_auditor
}`,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentId, resource, permission, payload } = body;

    const result = rebacEngine.evaluate(
      agentId || 'agent_procure',
      resource || 'erp:payment_gateway',
      permission || 'execute',
      payload || {}
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
