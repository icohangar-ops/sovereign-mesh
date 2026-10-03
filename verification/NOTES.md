# SovereignMesh — verification notes

Model: [`Rebac.lean`](Rebac.lean) (597 lines, 39 theorems, Lean 4.34.1, core
library only, compiles with plain `lean Rebac.lean`, exit 0). Axiom audit:
headline theorems depend on at most `propext` / `Quot.sound`;
`justifiedStar_iff_justified`, `cex_execute_without_council`, and
`cex_deny_yet_locked` are axiom-free. No source files were modified.

**What was modelled.** `lib/rebac-engine.ts`'s `evaluate` relation check and
decision pipeline, and `lib/chp-engine.ts`'s verdict arithmetic, composed the
way `app/api/deliberate/route.ts` wires them. The normative yardstick is
`AGENTS.md` §2–§4 (the same schema is served by `app/api/rebac/route.ts`
ll. 10–21). Where code and spec disagree, the model follows the **code** and
the divergence is a finding below.

The single most important fact about this codebase: despite the "Google
Zanzibar / SpiceDB" framing (README l. 93, AGENTS.md §2), the engine is a
flat list of direct tuples over bare agent ids with exactly one hardcoded
rewrite (`editor`/`executor` ⇒ `viewer`). There are no userset subjects, no
group expansion, no transitive closure, no intersection, no wildcards. The
proofs below are therefore about *that* semantics — which is internally
sound — plus machine-checked counterexamples where it diverges from the
schema the project advertises.

## Theorem → source mapping

### ReBAC core (`lib/rebac-engine.ts`)

| Lean | Models / proves | Source |
|---|---|---|
| `Tuple`, `tupleMatches`, `tupleMatches_iff` | tuple shape; per-tuple exact string test | `lib/types.ts` ll. 42–46; engine ll. 139–142 |
| `holdsRel`, `Holds`, `holdsRel_iff`, `list_any_iff` | "some tuple matches (subject, resource, relation)" | ll. 139–143 |
| `reqRel`, `reqRel_edit/write/execute/mutate` | permission → required relation; only four exact strings map above `viewer` | ll. 145–147 |
| `reqRel_unknown` | every other string maps to `viewer` | l. 145 (default) |
| `checkRel` | full relation check incl. the `viewer` rewrite | ll. 149–152 |
| `Justified` | justification = one granted tuple + ≤ 1 rewrite step | (semantics of ll. 149–152) |
| `justified_iff_check` | **soundness + completeness**: check `true` ⟺ justified | ll. 149–152 |
| `justified_chain_bound` | every justification rests on a single tuple; no multi-hop derivation exists | — |
| `no_tuple_no_check`, `checkRel_false_of_no_subject_tuples` | a subject with no tuples on a resource passes nothing | — |
| `Step`, `GrantsStar`, `step_lands_viewer`, `grantsStar_iff` | rewrite closure: both arrows land on the sink `viewer`; closure characterized exactly | (hypothetical closure of ll. 149–152) |
| `JustifiedStar`, `justifiedStar_iff_justified` | **transitive closure / cycles derive nothing new** | — |
| `initialTuples` | seeded store, verbatim | ll. 74–90 |
| `sanity_checks` | seeded demo rights (procure view, SRE execute, ledger edit) hold | ll. 74–90 |

### Spec comparison (AGENTS.md §2)

| Lean | Proves | Source |
|---|---|---|
| `Perm`, `specCheck` | the Zanzibar schema: `view = viewer+editor+executor`, `edit = editor`, `execute = executor & council_auditor` | AGENTS.md ll. 33–45 |
| `spec_view_eq_code` | code ≡ spec for `view` | |
| `spec_edit_eq_code` | code ≡ spec for `edit`/`write` | |
| `checkRel_execute_eq`, `checkRel_mutate_eq` | code's execute check is *exactly* `holds executor` — second conjunct absent | ll. 147, 149–152 |
| `spec_execute_imp_code` | spec-`execute` ⊆ code-`execute` (code strictly weaker) | |
| `checkRel_unknown_eq_view` | unrecognized permission ⟹ checked as spec-`view` | ll. 145–147 |
| `cex_execute_without_council` | **counterexample**: seed data lets `agent_procure` execute with zero `council_auditor` tuples in the store; spec denies | ll. 74–90 |
| `cex_delete_degrades_to_view` | **counterexample**: permission `"delete"` passes for a `viewer`-only agent | ll. 145–147 |
| `cex_case_sensitive_permission` | **counterexample**: `"Execute"` (→ view, via editor rewrite) passes where `"execute"` is denied, same agent/resource | ll. 146–147 |
| `sanity_challenger_adjudicator_powerless` | challenger & adjudicator hold no tuples; their `capabilities` lists are never consulted | ll. 74–90; ll. 108–152 |

### Decision pipeline (`evaluate`)

| Lean | Proves | Source |
|---|---|---|
| `Decision`, `evaluate` | armor → relation → gate → allow, in code order | ll. 117–137, 149–172, 186–219, 222–239 |
| `evaluate_allow_iff` | ALLOW ⟺ armor passed ∧ relation ok ∧ not gated | |
| `evaluate_gated_imp` | GATED certifies armor + relation both passed | ll. 201–219 |
| `evaluate_no_allow_of_not_relation` | no relation ⇒ never ALLOW | |
| `evaluate_gate_blocks_allow` | the gate is monotone: it only removes ALLOW | ll. 186–199 |

### CHP verdict (`lib/chp-engine.ts`)

Scores are modelled in integer hundredths: all constants are exact
hundredths and all reachable sums stay on the 0.01 grid, so the code's
float64 arithmetic and `toFixed(2)` (l. 128) are the identity on reachable
values — the integer model is faithful, including boundaries.

| Lean | Proves | Source |
|---|---|---|
| `risk100` | `challengerRiskScore` × 100 (0.55/0.08, 0.20, 0.18, 0.30, 0.15) | ll. 103–108 |
| `dirty` | the recomputation trigger — note `newIntegration` absent | l. 127 |
| `chpVerdict` | verdict: clean (LOCKED, 0.92); else R0 = 0.95 − risk, bands at 0.85 / 0.40 | ll. 124–131 |
| `chp_locked_imp_clean` | **the dirty branch's LOCKED outcome is unreachable** (any trigger ⇒ risk ≥ 26 ⇒ R0 ≤ 69): LOCKED only via the clean path | ll. 103–131 |
| `chp_locked_floor` | LOCKED ⇒ R0 ≥ 0.85 (AGENTS.md §4 floor holds) | AGENTS.md ll. 58–60 |
| `chp_rejected_band`, `chp_countersign_band` | REJECTED ⇒ R0 < 0.40; COUNTERSIGN ⇒ 0.40 ≤ R0 < 0.85 | ll. 129–131 |
| `chp_clean_verdict`, `chp_ni_invisible_when_clean` | clean-path verdict is constant, independent of `newIntegration` | ll. 124–127 |
| `cex_new_integration_locks` | **counterexample**: new-integration-only ⇒ (LOCKED, 0.92) | ll. 103–131 |
| `composedLock`, `composed_lock_independent` | the endpoint's lock component is independent of all ReBAC inputs | `app/api/deliberate/route.ts` ll. 35, 50–59 |
| `cex_deny_yet_locked` | **counterexample**: ReBAC DENY + clean payload ⇒ (DENY, LOCKED) signed lock | route ll. 50–59; engine ll. 14–21, 124–131 |

## Findings

**F1 — The spec's `execute` intersection is dropped; execute is single-key.**
AGENTS.md §2 defines `execute = executor & council_auditor`. `evaluate`
never reads `council_auditor` (ll. 145–152); the relation appears only in
the *reported* `requiredRelations` of a gated result (l. 208), which
nothing enforces. `checkRel_execute_eq` proves the code's check is exactly
"holds executor", and `cex_execute_without_council` shows it is live on
the seed data: nobody holds `council_auditor` anywhere, yet
`agent_procure` passes `execute` on `runtime:workflow_queue`. Under the
advertised schema, *no* execute could ever pass; under the code, every
executor passes alone.

**F2 — Unknown permission strings fail open to `view` (proved).**
`requiredRelation` defaults to `viewer` (l. 145) and matching is
case-sensitive, so `"delete"`, `"admin"`, `"sign"`, typos, and `"Execute"`
are all evaluated as read-level requests (`checkRel_unknown_eq_view`).
`cex_delete_degrades_to_view`: a `viewer`-only agent passes a `"delete"`
request. `cex_case_sensitive_permission`: `"Execute"` passes (via the
editor⇒viewer rewrite) for an agent whose genuine `"execute"` is denied —
the same engine gives opposite verdicts for two spellings of one intent,
and the permissive one is the misspelling. There is no "unknown
permission" denial anywhere in the pipeline.

**F3 — The gate and verdict inputs are self-reported by the requester.**
The high-stakes triggers read payload fields the caller supplies:
`requestCostUSD`/`amountUSD` (ll. 174–179), `integrationAgeDays`/
`vendorAgeDays` (ll. 180–185), `deployStage`/`releaseStage`/`forceDeploy`
(ll. 187–192). Omitting the cost, sending it as a string, or sending
`NaN` (`typeof NaN === 'number'` but `NaN > 5000` is false) skips the
financial gate entirely (l. 186); nothing cross-checks the declared cost
against the action. The deploy trigger is substring matching —
`resource.includes('deployment')` / `includes('endpoint')` (ll. 187–192) —
so unrelated resources containing those substrings over-gate, while a
production deploy on a resource named otherwise, with honest-looking
payload fields, under-gates. The Lean model treats the trigger as an
abstract boolean precisely because its provenance is untrusted input.

**F4 — Spec gating rule 2 (IAM/firewall/DNS) has no ReBAC-side check, and
rule 3 (anomaly > 0.35) is not implemented as a gate.** AGENTS.md §3 lists
IAM role modification as a mandatory CHP trigger; the only thing that
catches `roles/owner` is a Model Armor *regex over the payload text*
(`lib/model-armor.ts` l. 30), i.e. detection depends on the string
appearing verbatim in the payload JSON. Armor itself is binary in
`evaluate`: `passed = riskScore < 0.4` (model-armor.ts l. 84); the risk
score is never consulted for gating. One HIGH pattern scores 0.35 —
passes armor, triggers no gate (0.35 is not > 0.35), and can end in ALLOW;
two HIGH patterns score 0.7 and hard-DENY rather than escalate to CHP,
stricter than the spec's "gate" but destructive for legitimate traffic
with two flagged strings.

**F5 — Audit flags are dropped on the ALLOW and relation-DENY paths.**
Both branches hardcode `armorCheck.flags: []` (ll. 167, 233) even when
Model Armor raised flags that scored below the fail threshold; only the
GATED branch preserves them (l. 215). Downstream, CHP computes
`hasArmorFlags` from exactly this field (`lib/chp-engine.ts` l. 101), so
whether the consensus layer can see a detected pattern depends on which
ReBAC branch happened to produce the result — an ALLOW-path result with a
real HIGH-severity pattern reports zero flags to the audit trail.

**F6 — The "signed" decision lock is an unkeyed SHA-256, and CHP runs on
DENY.** `deliberate` computes `signatureHash` as plain
`crypto.createHash('sha256')` over the lock JSON (chp-engine.ts
ll. 161–173) — no key, HMAC, or private key exists in the code, so anyone
can recompute a valid-looking signature for a forged lock, contra
AGENTS.md §4 ("signed with the Adjudicator key"). Separately,
`deliberate` never reads `rebacResult.decision` (only `.reason` and
`.armorCheck`), and the API route invokes it for DENY results too
(route.ts ll. 50–59, comment: "If GATED_FOR_CONSENSUS or DENY, run the
full Adversarial CHP deliberation"). `cex_deny_yet_locked` proves the
composed endpoint emits a LOCKED, R0 = 0.92 lock for a request the ReBAC
gate denied; only consumers who separately inspect `rebacResult.decision`
are protected — the lock artifact itself asserts consensus approval.

**F7 — The CHP verdict is deterministic arithmetic; the debate is
decorative, and one trigger is wired to nothing.** The three LLM rounds'
content never influences `status`/`r0Score` (ll. 124–131 depend only on
payload heuristics); `challengerConfidence` (l. 109) is computed and
unused for the verdict. And `newIntegration` contributes 0.15 to
`challengerRiskScore` (l. 108) but is missing from the recomputation
trigger (l. 127): `cex_new_integration_locks` — a < 14-day-old vendor
with no other flags deliberates to a clean (LOCKED, 0.92), even though
AGENTS.md §3 rule 4 names exactly this case as mandatory-CHP. (ReBAC does
gate it autonomously, l. 193; the *deliberation outcome* ignores it.)
`chp_locked_imp_clean` additionally shows the recomputation branch's
`LOCKED` else-outcome is dead code given the constants — any single
trigger already forces R0 ≤ 0.69, i.e. COUNTERSIGN or REJECTED. Boundary
note: vendor mismatch alone gives R0 = 0.40 exactly → COUNTERSIGN_REQUIRED
(not < 0.4), the mildest possible response to an unverified integration.

**F8 — Tuple store mutability.** `addTuple` (ll. 101–103) appends any
tuple — arbitrary subject/resource/relation strings, no schema validation
against the AGENTS.md definitions, no duplicate check — and there is no
removal/revocation operation at all. No API route in this repo exposes
`addTuple` (the routes expose only `evaluate` and a read of the tuples),
so today this is a library-level hazard rather than a remote one; but any
future caller inherits unauthenticated, irrevocable grant-writing.
`getTuples` returns a shallow copy (ll. 96–98), so the store cannot be
mutated through it.

**F9 — Ambient agent attributes are ignored.** `evaluate` consults only
the tuple store: an agent's `status` (`RESTRICTED`/`IDLE`), `riskTier`,
and `policyViolations` (types.ts ll. 14–23) have no effect, and neither do
the `capabilities` arrays (which disagree with the tuples — e.g.
`agent_procure`'s capabilities omit its seeded `editor` on
`ledger:trace_store`). Restricting an agent in the fleet registry does
not restrict it at the gate. The API routes also default missing identity
fields to privileged values: `agentId || 'agent_procure'` and
`permission || 'execute'` (`app/api/rebac/route.ts` ll. 24–28;
`app/api/deliberate/route.ts` ll. 29–32) — a malformed request is
evaluated as the procurement agent attempting `execute`, not rejected.

**F10 — AGENTS.md §4 lock conditions beyond the R0 floor are
unenforced.** "Challenger rebuttal addressed with cited evidentiary
artifacts from Memory Bank" is not checked anywhere: rounds always carry
citation strings by construction (chp-engine.ts ll. 57, 117, 155),
including the hardcoded fallback `'MemoryBank: Baseline_Check'` (l. 117),
and nothing validates them against the Memory Bank. The R0 ≥ 0.85 floor
itself *is* sound — proved as `chp_locked_floor`.

## Modelling caveats

- The high-stakes gate trigger, Model Armor verdict, and CHP heuristic
  flags are abstract booleans at the Lean boundary; the model verifies
  the *decision logic* over them, not the regexes, substring tests, or
  payload parsing that produce them (see F3/F4).
- `addTuple` dynamics (store evolution) are modelled only through the
  universal quantification over `ts`: every theorem holds for every tuple
  store, including any store reachable by appends.
- LLM round content, timestamps, and the Gemini calls are outside the
  verdict's causal path in the code and therefore outside the model.
