import { initLangfuseTracing } from './lib/observability/langfuse';

export function register() {
  initLangfuseTracing();
}
