import { NextResponse } from 'next/server';
import { observe } from '@langfuse/tracing';
import { rebacEngine } from '@/lib/rebac-engine';
import { chpEngine } from '@/lib/chp-engine';
import { langfuseSpanProcessor } from '@/lib/observability/langfuse';

const handler = async (req: Request) => {
  try {
    const body = await req.json();
    const {
      decisionId,
      title,
      agentId,
      resource,
      permission,
      payload,
    } = body;

    const decId = decisionId || `dec-${Date.now()}`;
    const targetTitle = title || 'Enterprise Action Request';
    const targetAgent = agentId || 'agent_procure';
    const targetResource = resource || 'erp:payment_gateway';
    const targetPermission = permission || 'execute';
    const targetPayload = payload || {};

    // 1. Evaluate ReBAC & Model Armor
    const rebacResult = rebacEngine.evaluate(
      targetAgent,
      targetResource,
      targetPermission,
      targetPayload
    );

    // 2. If decision is direct ALLOW and not high stakes, generate immediate lock
    if (rebacResult.decision === 'ALLOW') {
      const immediateLock = await chpEngine.deliberate(
        decId,
        targetTitle,
        targetAgent,
        targetResource,
        targetPayload,
        rebacResult
      );
      return NextResponse.json({
        rebacResult,
        lock: immediateLock,
      });
    }

    // 3. If GATED_FOR_CONSENSUS or DENY, run the full Adversarial CHP deliberation
    const lock = await chpEngine.deliberate(
      decId,
      targetTitle,
      targetAgent,
      targetResource,
      targetPayload,
      rebacResult
    );

    return NextResponse.json({
      rebacResult,
      lock,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during deliberation';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await langfuseSpanProcessor.forceFlush();
  }
};

export const POST = observe(handler, { name: 'api.deliberate' });
