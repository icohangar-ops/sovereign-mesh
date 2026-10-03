/-
  SovereignMesh — Lean 4 verification of the ReBAC check (lib/rebac-engine.ts)
  and the CHP verdict (lib/chp-engine.ts), against the normative schema in
  AGENTS.md §2–§4 (also served verbatim by app/api/rebac/route.ts).

  Self-contained, core library only. Compile with:
      ~/.elan/bin/lean Rebac.lean
  No `sorry` / `admit` / custom axioms.

  What the code actually implements (followed here, not the marketing):
  the "Zanzibar graph" is a flat list of direct tuples over bare agent ids.
  There are no userset subjects, no group expansion, no transitive closure,
  no wildcards, and exactly one rewrite: `editor` and `executor` also count
  as `viewer` (rebac-engine.ts ll. 150–153). The model proves the check is
  sound and complete w.r.t. exactly that semantics (§2–§3), proves that
  closing the rewrite under arbitrary transitive chaining (incl. cycles)
  derives nothing more (§3), and then measures the code against the
  AGENTS.md Zanzibar schema (§4), where it diverges: the spec's
  `execute = executor & council_auditor` intersection is dropped, and any
  unrecognized permission string silently degrades to the `viewer` check.
-/

namespace SovereignMesh

/-! ## 1. Tuples and direct holdings (rebac-engine.ts ll. 84–103, 140–143) -/

/-- A relationship tuple, fields in the TS order `{ resource, relation, subject }`
    (lib/types.ts ll. 42–46). Subjects and resources are bare strings: the code
    has no userset syntax, so a "group" subject would just be an inert string. -/
structure Tuple where
  resource : String
  relation : String
  subject  : String
deriving DecidableEq, Repr

/-- `t.subject === agentId && t.resource === resource && t.relation === relation`
    — the per-tuple test inside the `filter` at rebac-engine.ts ll. 140–143. -/
def tupleMatches (t : Tuple) (subject resource relation : String) : Bool :=
  decide (t.subject = subject ∧ t.resource = resource ∧ t.relation = relation)

theorem tupleMatches_iff {t : Tuple} {subject resource relation : String} :
    tupleMatches t subject resource relation = true ↔
      t.subject = subject ∧ t.resource = resource ∧ t.relation = relation := by
  simp [tupleMatches]

/-- The engine's relation test: some stored tuple matches exactly.
    (`matchingTuples` / `matchingRelations`, rebac-engine.ts ll. 140–148.) -/
def holdsRel (ts : List Tuple) (subject resource relation : String) : Bool :=
  ts.any fun t => tupleMatches t subject resource relation

/-- Propositional form of `holdsRel`. -/
def Holds (ts : List Tuple) (subject resource relation : String) : Prop :=
  ∃ t ∈ ts, t.subject = subject ∧ t.resource = resource ∧ t.relation = relation

theorem list_any_iff {α : Type} {p : α → Bool} {l : List α} :
    l.any p = true ↔ ∃ x ∈ l, p x = true := by
  induction l with
  | nil => simp
  | cons a l ih =>
      simp only [List.any_cons, Bool.or_eq_true, List.mem_cons]
      constructor
      · rintro (h | h)
        · exact ⟨a, Or.inl rfl, h⟩
        · obtain ⟨x, hx, hpx⟩ := ih.mp h
          exact ⟨x, Or.inr hx, hpx⟩
      · rintro ⟨x, (rfl | hx), hpx⟩
        · exact Or.inl hpx
        · exact Or.inr (ih.mpr ⟨x, hx, hpx⟩)

theorem holdsRel_iff {ts : List Tuple} {subject resource relation : String} :
    holdsRel ts subject resource relation = true ↔
      Holds ts subject resource relation := by
  constructor
  · intro h
    obtain ⟨t, ht, hm⟩ := list_any_iff.mp h
    exact ⟨t, ht, tupleMatches_iff.mp hm⟩
  · rintro ⟨t, ht, h⟩
    exact list_any_iff.mpr ⟨t, ht, tupleMatches_iff.mpr h⟩

/-! ## 2. The permission → relation map and the check (ll. 146–153)

`requiredRelation` defaults to `viewer`; only the four exact, case-sensitive
strings `edit`/`write`/`execute`/`mutate` map higher. Everything else —
including `delete`, `admin`, `Execute`, and typos — is checked as `viewer`. -/

def reqRel (permission : String) : String :=
  if permission = "edit" ∨ permission = "write" then "editor"
  else if permission = "execute" ∨ permission = "mutate" then "executor"
  else "viewer"

theorem reqRel_edit : reqRel "edit" = "editor" := rfl
theorem reqRel_write : reqRel "write" = "editor" := rfl
theorem reqRel_execute : reqRel "execute" = "executor" := rfl
theorem reqRel_mutate : reqRel "mutate" = "executor" := rfl

theorem reqRel_unknown {p : String} (h1 : p ≠ "edit") (h2 : p ≠ "write")
    (h3 : p ≠ "execute") (h4 : p ≠ "mutate") : reqRel p = "viewer" := by
  simp [reqRel, h1, h2, h3, h4]

/-- The full relation check of `evaluate` step 2 (ll. 150–153):
    direct hit on the required relation, or — for `viewer` only — an
    `editor`/`executor` tuple via the one hardcoded rewrite. -/
def checkRel (ts : List Tuple) (subject resource permission : String) : Bool :=
  holdsRel ts subject resource (reqRel permission) ||
  (decide (reqRel permission = "viewer") &&
    (holdsRel ts subject resource "editor" || holdsRel ts subject resource "executor"))

/-- A permission is *justified* when a granted tuple backs it: either a tuple
    for the required relation itself, or one rewrite step from `editor` /
    `executor` down to `viewer`. This is the strongest justification notion
    the code supports — there is no longer chain. -/
inductive Justified (ts : List Tuple) (subject resource permission : String) : Prop where
  | direct :
      Holds ts subject resource (reqRel permission) →
      Justified ts subject resource permission
  | rewriteEditor :
      reqRel permission = "viewer" → Holds ts subject resource "editor" →
      Justified ts subject resource permission
  | rewriteExecutor :
      reqRel permission = "viewer" → Holds ts subject resource "executor" →
      Justified ts subject resource permission

/-- **Soundness + completeness of the check**: the algorithm answers `true`
    exactly when a granted tuple justifies the permission. No privilege
    escalation relative to the implemented semantics. -/
theorem justified_iff_check {ts : List Tuple} {subject resource permission : String} :
    Justified ts subject resource permission ↔ checkRel ts subject resource permission = true := by
  constructor
  · intro h
    cases h with
    | direct hh =>
        simp only [checkRel, Bool.or_eq_true]
        exact Or.inl (holdsRel_iff.mpr hh)
    | rewriteEditor hreq hh =>
        simp only [checkRel, Bool.or_eq_true, Bool.and_eq_true, decide_eq_true_eq]
        exact Or.inr ⟨hreq, Or.inl (holdsRel_iff.mpr hh)⟩
    | rewriteExecutor hreq hh =>
        simp only [checkRel, Bool.or_eq_true, Bool.and_eq_true, decide_eq_true_eq]
        exact Or.inr ⟨hreq, Or.inr (holdsRel_iff.mpr hh)⟩
  · intro h
    simp only [checkRel, Bool.or_eq_true, Bool.and_eq_true, decide_eq_true_eq] at h
    cases h with
    | inl hh => exact .direct (holdsRel_iff.mp hh)
    | inr h =>
        obtain ⟨hreq, hh⟩ := h
        cases hh with
        | inl he => exact .rewriteEditor hreq (holdsRel_iff.mp he)
        | inr he => exact .rewriteExecutor hreq (holdsRel_iff.mp he)

/-- **Chain bound**: every justification rests on a single granted tuple —
    either for the required relation itself, or (viewer only) one step away.
    No multi-hop derivation exists in this engine. -/
theorem justified_chain_bound {ts : List Tuple} {subject resource permission : String}
    (h : Justified ts subject resource permission) :
    Holds ts subject resource (reqRel permission) ∨
      (reqRel permission = "viewer" ∧
        (Holds ts subject resource "editor" ∨ Holds ts subject resource "executor")) := by
  cases h with
  | direct hh => exact Or.inl hh
  | rewriteEditor hreq hh => exact Or.inr ⟨hreq, Or.inl hh⟩
  | rewriteExecutor hreq hh => exact Or.inr ⟨hreq, Or.inr hh⟩

/-- A subject with no tuples on a resource passes nothing, for any permission. -/
theorem no_tuple_no_check {ts : List Tuple} {subject resource permission : String}
    (h : ∀ rel : String, ¬ Holds ts subject resource rel) :
    ¬ checkRel ts subject resource permission = true := by
  intro hc
  have hj := justified_iff_check.mpr hc
  cases justified_chain_bound hj with
  | inl hh => exact h _ hh
  | inr h' =>
      obtain ⟨-, hh⟩ := h'
      cases hh with
      | inl he => exact h _ he
      | inr he => exact h _ he

/-! ## 3. Closing the rewrite under transitivity changes nothing

Even if the `editor`/`executor` ⇒ `viewer` rewrite were iterated along
arbitrary chains (the thing Zanzibar's userset rewriting does, and the place
cycles would bite), no new permission appears: both arrows land on `viewer`,
which is a sink, and there are no cycles between distinct relations. -/

/-- One rewrite step, as implemented: holding the source relation counts
    toward the target relation. -/
inductive Step : String → String → Prop where
  | editorViewer : Step "editor" "viewer"
  | executorViewer : Step "executor" "viewer"

theorem step_lands_viewer {a b : String} (h : Step a b) :
    b = "viewer" ∧ (a = "editor" ∨ a = "executor") := by
  cases h with
  | editorViewer => exact ⟨rfl, Or.inl rfl⟩
  | executorViewer => exact ⟨rfl, Or.inr rfl⟩

/-- Reflexive–transitive closure of the rewrite. -/
inductive GrantsStar : String → String → Prop where
  | refl (r : String) : GrantsStar r r
  | step {a b : String} : Step a b → GrantsStar a b
  | trans {a b c : String} : GrantsStar a b → GrantsStar b c → GrantsStar a c

theorem grantsStar_iff {a b : String} :
    GrantsStar a b ↔
      b = a ∨ (b = "viewer" ∧ (a = "editor" ∨ a = "executor")) := by
  constructor
  · intro h
    induction h with
    | refl r => exact Or.inl rfl
    | step hs =>
        obtain ⟨hb, ha⟩ := step_lands_viewer hs
        exact Or.inr ⟨hb, ha⟩
    | trans _ _ ih1 ih2 =>
        cases ih2 with
        | inl h2 => exact h2 ▸ ih1
        | inr h2 =>
            obtain ⟨hc, hb⟩ := h2
            refine Or.inr ⟨hc, ?_⟩
            cases ih1 with
            | inl h1 => exact h1 ▸ hb
            | inr h1 =>
                obtain ⟨hbv, -⟩ := h1
                cases hb with
                | inl hbe => exact absurd (hbe ▸ hbv) (by decide)
                | inr hbe => exact absurd (hbe ▸ hbv) (by decide)
  · rintro (rfl | ⟨rfl, (rfl | rfl)⟩)
    · exact .refl _
    · exact .step .editorViewer
    · exact .step .executorViewer

/-- Justification via a tuple plus an arbitrary rewrite *chain*. -/
def JustifiedStar (ts : List Tuple) (subject resource permission : String) : Prop :=
  ∃ rel : String, Holds ts subject resource rel ∧ GrantsStar rel (reqRel permission)

/-- **Cycles/chains cannot manufacture permissions**: transitive closure of
    the rewrite derives exactly the permissions the one-step check derives. -/
theorem justifiedStar_iff_justified {ts : List Tuple}
    {subject resource permission : String} :
    JustifiedStar ts subject resource permission ↔
      Justified ts subject resource permission := by
  constructor
  · rintro ⟨rel, hh, hstar⟩
    cases (grantsStar_iff.mp hstar) with
    | inl h =>
        subst h
        exact .direct hh
    | inr h =>
        obtain ⟨hreq, hrel⟩ := h
        cases hrel with
        | inl he =>
            subst he
            exact .rewriteEditor hreq hh
        | inr he =>
            subst he
            exact .rewriteExecutor hreq hh
  · intro h
    cases h with
    | direct hh => exact ⟨reqRel permission, hh, .refl _⟩
    | rewriteEditor hreq hh =>
        refine ⟨"editor", hh, ?_⟩
        rw [hreq]
        exact .step .editorViewer
    | rewriteExecutor hreq hh =>
        refine ⟨"executor", hh, ?_⟩
        rw [hreq]
        exact .step .executorViewer

/-! ## 4. The AGENTS.md Zanzibar schema vs. the code

AGENTS.md §2 (and the schema string in app/api/rebac/route.ts ll. 10–21):

    permission view    = viewer + editor + executor
    permission edit    = editor
    permission execute = executor & council_auditor

The code matches `view` and `edit` exactly. For `execute` it drops the
`council_auditor` conjunct entirely — `council_auditor` is never read by
`evaluate` (it appears only in the `requiredRelations` *report* of a gated
result, rebac-engine.ts l. 208). -/

inductive Perm where
  | view | edit | execute
deriving DecidableEq, Repr

def specCheck (ts : List Tuple) (subject resource : String) : Perm → Bool
  | .view =>
      holdsRel ts subject resource "viewer" ||
      holdsRel ts subject resource "editor" ||
      holdsRel ts subject resource "executor"
  | .edit => holdsRel ts subject resource "editor"
  | .execute =>
      holdsRel ts subject resource "executor" &&
      holdsRel ts subject resource "council_auditor"

/-- Spec `view` and the code agree — for the permission string "view", and
    hence (see `checkRel_unknown_eq_view`) for *every* unrecognized string. -/
theorem spec_view_eq_code {ts : List Tuple} {subject resource : String} :
    specCheck ts subject resource .view = checkRel ts subject resource "view" := by
  have hreq : reqRel "view" = "viewer" := rfl
  simp only [specCheck, checkRel, hreq]
  cases holdsRel ts subject resource "viewer" <;>
    cases holdsRel ts subject resource "editor" <;>
    cases holdsRel ts subject resource "executor" <;> rfl

/-- Spec `edit` and the code agree (for both spellings the code accepts). -/
theorem spec_edit_eq_code {ts : List Tuple} {subject resource : String} :
    specCheck ts subject resource .edit = checkRel ts subject resource "edit" ∧
    specCheck ts subject resource .edit = checkRel ts subject resource "write" := by
  have h1 : reqRel "edit" = "editor" := rfl
  have h2 : reqRel "write" = "editor" := rfl
  simp only [specCheck, checkRel, h1, h2]
  constructor <;> cases holdsRel ts subject resource "editor" <;> rfl

/-- The code's `execute` check is *exactly* "holds executor" — the spec's
    second conjunct is simply absent. -/
theorem checkRel_execute_eq {ts : List Tuple} {subject resource : String} :
    checkRel ts subject resource "execute" = holdsRel ts subject resource "executor" := by
  have hreq : reqRel "execute" = "executor" := rfl
  simp only [checkRel, hreq]
  cases holdsRel ts subject resource "executor" <;> rfl

theorem checkRel_mutate_eq {ts : List Tuple} {subject resource : String} :
    checkRel ts subject resource "mutate" = holdsRel ts subject resource "executor" := by
  have hreq : reqRel "mutate" = "executor" := rfl
  simp only [checkRel, hreq]
  cases holdsRel ts subject resource "executor" <;> rfl

/-- Everything the spec grants for `execute`, the code grants too
    (the code is strictly weaker here, never stricter). -/
theorem spec_execute_imp_code {ts : List Tuple} {subject resource : String}
    (h : specCheck ts subject resource .execute = true) :
    checkRel ts subject resource "execute" = true := by
  rw [checkRel_execute_eq]
  simp only [specCheck, Bool.and_eq_true] at h
  exact h.1

/-- **Fail-open permission map**: any permission string outside the four
    recognized ones is checked as spec-`view`. There is no "unknown
    permission" outcome. -/
theorem checkRel_unknown_eq_view {ts : List Tuple} {subject resource : String}
    {p : String} (h1 : p ≠ "edit") (h2 : p ≠ "write")
    (h3 : p ≠ "execute") (h4 : p ≠ "mutate") :
    checkRel ts subject resource p = specCheck ts subject resource .view := by
  have hreq : reqRel p = "viewer" := reqRel_unknown h1 h2 h3 h4
  have hview : reqRel "view" = "viewer" := rfl
  have hcong : checkRel ts subject resource p =
      checkRel ts subject resource "view" := by
    simp only [checkRel, hreq, hview]
  rw [hcong, ← spec_view_eq_code]

/-! ### The seeded tuple store (rebac-engine.ts ll. 84–99), verbatim -/

def initialTuples : List Tuple :=
  [ ⟨"runtime:workflow_queue", "viewer",   "agent_procure"⟩,
    ⟨"runtime:workflow_queue", "executor", "agent_procure"⟩,
    ⟨"ledger:trace_store",     "editor",   "agent_procure"⟩,
    ⟨"model:endpoint",         "viewer",   "agent_soc_remed"⟩,
    ⟨"model:endpoint",         "editor",   "agent_soc_remed"⟩,
    ⟨"release:deployment_gate", "executor", "agent_soc_remed"⟩,
    ⟨"ledger:trace_store",     "viewer",   "agent_erp_ledger"⟩,
    ⟨"ledger:trace_store",     "editor",   "agent_erp_ledger"⟩ ]

/-- Sanity: the seeded rights the demo relies on do check out. -/
theorem sanity_checks :
    checkRel initialTuples "agent_procure" "runtime:workflow_queue" "view" = true ∧
    checkRel initialTuples "agent_soc_remed" "release:deployment_gate" "execute" = true ∧
    checkRel initialTuples "agent_erp_ledger" "ledger:trace_store" "edit" = true := by
  decide

/-- If a subject owns no tuples at all in the store, every check for it
    fails: justification would require a tuple of that subject. -/
theorem checkRel_false_of_no_subject_tuples {ts : List Tuple}
    {subject resource permission : String}
    (h : ∀ t ∈ ts, t.subject ≠ subject) :
    checkRel ts subject resource permission = false := by
  cases hc : checkRel ts subject resource permission with
  | false => rfl
  | true =>
      exfalso
      have hj := justified_iff_check.mpr hc
      cases justified_chain_bound hj with
      | inl hh =>
          obtain ⟨t, ht, hsub, -, -⟩ := hh
          exact h t ht hsub
      | inr h' =>
          obtain ⟨-, hh⟩ := h'
          cases hh with
          | inl he =>
              obtain ⟨t, ht, hsub, -, -⟩ := he
              exact h t ht hsub
          | inr he =>
              obtain ⟨t, ht, hsub, -, -⟩ := he
              exact h t ht hsub

/-- Two of the five fleet agents hold no tuples at all — the adjudicator and
    challenger can never pass `evaluate`, whatever their `capabilities` say
    (capability lists are never consulted by the engine). -/
theorem sanity_challenger_adjudicator_powerless :
    (∀ p : String, checkRel initialTuples "agent_challenger" "ledger:trace_store" p = false) ∧
    (∀ p : String, checkRel initialTuples "agent_adjudicator" "ledger:trace_store" p = false) := by
  constructor <;> intro p <;> apply checkRel_false_of_no_subject_tuples <;>
    · intro t ht
      simp only [initialTuples, List.mem_cons, List.not_mem_nil, or_false] at ht
      rcases ht with rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl <;> decide

/-- **Counterexample — the dropped intersection is live on the seed data.**
    `agent_procure` executes on `runtime:workflow_queue` under the code,
    although *no one* holds `council_auditor` anywhere in the store, so the
    AGENTS.md schema denies every `execute` whatsoever. -/
theorem cex_execute_without_council :
    checkRel initialTuples "agent_procure" "runtime:workflow_queue" "execute" = true ∧
    specCheck initialTuples "agent_procure" "runtime:workflow_queue" .execute = false ∧
    (∀ t ∈ initialTuples, t.relation ≠ "council_auditor") := by
  decide

/-- **Counterexample — unknown permissions degrade to `view`.**
    A request for permission `"delete"` by an agent holding only `viewer`
    passes the relation check. The engine has no notion of an unrecognized
    permission. -/
theorem cex_delete_degrades_to_view :
    checkRel initialTuples "agent_erp_ledger" "ledger:trace_store" "delete" = true ∧
    checkRel initialTuples "agent_erp_ledger" "ledger:trace_store" "delete" =
      specCheck initialTuples "agent_erp_ledger" "ledger:trace_store" .view := by
  decide

/-- **Counterexample — the map is case-sensitive, and the fall-through is
    permissive.** `"Execute"` is not `"execute"`: it is silently treated as a
    *view* request, which the ledger auditor's `editor` tuple satisfies via
    the rewrite — while the genuine `"execute"` is denied for the same
    agent/resource. The same engine returns opposite verdicts for two
    spellings of one intent, and the wrong one is the permissive one. -/
theorem cex_case_sensitive_permission :
    checkRel initialTuples "agent_erp_ledger" "ledger:trace_store" "Execute" = true ∧
    checkRel initialTuples "agent_erp_ledger" "ledger:trace_store" "execute" = false := by
  decide

/-! ## 5. The `evaluate` pipeline (rebac-engine.ts ll. 108–239)

Order: Model Armor (ll. 117–137) → relation check (ll. 140–174) →
high-stakes gate (ll. 188–218) → ALLOW (ll. 221–238). The gate trigger
(financial / deploy / new-integration) is a single boolean here; §NOTES
discusses that its inputs are caller-supplied payload fields. -/

inductive Decision where
  | allow | deny | gated
deriving DecidableEq, Repr

def evaluate (armorPassed relationOk gated : Bool) : Decision :=
  if !armorPassed then .deny
  else if !relationOk then .deny
  else if gated then .gated
  else .allow

theorem evaluate_allow_iff {a r g : Bool} :
    evaluate a r g = .allow ↔ a = true ∧ r = true ∧ g = false := by
  cases a <;> cases r <;> cases g <;> decide

/-- A gated result certifies that armor passed and the relation check
    passed: consensus escalation never substitutes for authorization. -/
theorem evaluate_gated_imp {a r g : Bool} :
    evaluate a r g = .gated → a = true ∧ r = true ∧ g = true := by
  cases a <;> cases r <;> cases g <;> decide

/-- No relation, no allow — regardless of armor and gate state. -/
theorem evaluate_no_allow_of_not_relation {a g : Bool} :
    evaluate a false g ≠ .allow := by
  cases a <;> cases g <;> decide

/-- The high-stakes gate is monotone: it can only remove an ALLOW,
    never create one. -/
theorem evaluate_gate_blocks_allow {a r : Bool} :
    evaluate a r true ≠ .allow := by
  cases a <;> cases r <;> decide

/-! ## 6. The CHP verdict (lib/chp-engine.ts ll. 91–142)

`deliberate` runs three LLM rounds whose text never influences the verdict:
the status is pure arithmetic on payload heuristics. Scores are modelled in
integer hundredths (×100): every constant in the code is an exact hundredth
(0.55/0.08/0.20/0.18/0.30/0.15, floors 0.85/0.40, base 0.95, clean 0.92) and
every reachable sum stays on the 0.01 grid, so the code's float64 +
`toFixed(2)` rounding (l. 138) is the identity on reachable values and the
integer model is faithful.

The verdict trigger (l. 136) is `vendorMismatch ∨ armorFlags ∨
anomalousAmount ∨ breakerRisk`. Note what is *absent*: `newIntegration`
feeds `challengerRiskScore` (l. 113) but not the trigger — and the whole
function never receives the ReBAC decision. -/

inductive LockStatus where
  | locked | rejected | countersign
deriving DecidableEq, Repr

/-- `challengerRiskScore` × 100 (ll. 107–113), components in code order. -/
def risk100 (vendorMismatch anomalous breaker armorFlags newIntegration : Bool) : Int :=
  (if vendorMismatch then 55 else 8) +
  (if anomalous then 20 else 0) +
  (if breaker then 18 else 0) +
  (if armorFlags then 30 else 0) +
  (if newIntegration then 15 else 0)

/-- The recomputation trigger (l. 136). `newIntegration` is not in it. -/
def dirty (vendorMismatch anomalous breaker armorFlags : Bool) : Bool :=
  vendorMismatch || anomalous || breaker || armorFlags

/-- The verdict (ll. 133–142): `(status, R0 × 100)`. -/
def chpVerdict (vm anom brk armor ni : Bool) : LockStatus × Int :=
  if !dirty vm anom brk armor then (.locked, 92)
  else
    let r0 := 95 - risk100 vm anom brk armor ni
    if r0 < 85 then (if r0 < 40 then (.rejected, r0) else (.countersign, r0))
    else (.locked, r0)

/-- **The dirty branch's LOCKED outcome is dead code.** Any triggered flag
    pushes the risk to ≥ 26 (breaker alone: 8 + 18), so R0 ≤ 69 < 85 and the
    verdict can never lock from the recomputation branch: LOCKED is reached
    *only* by the untouched clean path. -/
theorem chp_locked_imp_clean {vm anom brk armor ni : Bool} :
    (chpVerdict vm anom brk armor ni).1 = .locked →
    dirty vm anom brk armor = false := by
  cases vm <;> cases anom <;> cases brk <;> cases armor <;> cases ni <;>
    simp only [chpVerdict, dirty, risk100] <;> decide

/-- AGENTS.md §4's floor does hold: a LOCKED verdict always has R0 ≥ 0.85. -/
theorem chp_locked_floor {vm anom brk armor ni : Bool} :
    (chpVerdict vm anom brk armor ni).1 = .locked →
    85 ≤ (chpVerdict vm anom brk armor ni).2 := by
  cases vm <;> cases anom <;> cases brk <;> cases armor <;> cases ni <;>
    simp only [chpVerdict, dirty, risk100] <;> decide

theorem chp_rejected_band {vm anom brk armor ni : Bool} :
    (chpVerdict vm anom brk armor ni).1 = .rejected →
    (chpVerdict vm anom brk armor ni).2 < 40 := by
  cases vm <;> cases anom <;> cases brk <;> cases armor <;> cases ni <;>
    simp only [chpVerdict, dirty, risk100] <;> decide

theorem chp_countersign_band {vm anom brk armor ni : Bool} :
    (chpVerdict vm anom brk armor ni).1 = .countersign →
    40 ≤ (chpVerdict vm anom brk armor ni).2 ∧
    (chpVerdict vm anom brk armor ni).2 < 85 := by
  cases vm <;> cases anom <;> cases brk <;> cases armor <;> cases ni <;>
    simp only [chpVerdict, dirty, risk100] <;> decide

/-- On the clean path the verdict is constant — in particular it does not
    depend on `newIntegration` at all. -/
theorem chp_clean_verdict {vm anom brk armor ni : Bool}
    (h : dirty vm anom brk armor = false) :
    chpVerdict vm anom brk armor ni = (.locked, 92) := by
  simp only [chpVerdict, h]
  rfl

theorem chp_ni_invisible_when_clean {vm anom brk armor : Bool}
    (h : dirty vm anom brk armor = false) (ni₁ ni₂ : Bool) :
    chpVerdict vm anom brk armor ni₁ = chpVerdict vm anom brk armor ni₂ := by
  rw [chp_clean_verdict h, chp_clean_verdict h]

/-- **Counterexample — a brand-new integration deliberates to a clean
    LOCKED.** With only `newIntegration` set (a vendor created < 14 days ago —
    AGENTS.md §3 rule 4 mandates CHP for exactly this), the trigger at
    l. 136 does not fire, so the verdict is the untouched clean score,
    indistinguishable from a fully vetted proposal. The 0.15 risk the code
    *did* add for newness (l. 113) is never consulted. -/
theorem cex_new_integration_locks :
    chpVerdict false false false false true = (.locked, 92) := by
  decide

/-! ## 7. Composition: the lock does not depend on the ReBAC verdict

app/api/deliberate/route.ts calls `chpEngine.deliberate` in *every* branch —
direct ALLOW (ll. 34–46), and GATED **or DENY** (ll. 48–62) alike — and
`deliberate` itself never reads `rebacResult.decision` (only `.reason` and
`.armorCheck`). The composition therefore admits a signed LOCKED lock for a
request the ReBAC gate denied. -/

/-- The composed system, at decision level: ReBAC decision × CHP status,
    computed independently from disjoint inputs, as wired in route.ts. -/
def composedLock (armorPassed relationOk gated
    vm anom brk armor ni : Bool) : Decision × LockStatus :=
  (evaluate armorPassed relationOk gated, (chpVerdict vm anom brk armor ni).1)

/-- The lock component is definitionally independent of every ReBAC input. -/
theorem composed_lock_independent {a r g vm anom brk armor ni : Bool} :
    (composedLock a r g vm anom brk armor ni).2 =
      (chpVerdict vm anom brk armor ni).1 :=
  rfl

/-- **Counterexample — DENY in, LOCKED out.** An agent holding no relation
    at all (ReBAC: DENY) with a clean-looking payload receives a
    cryptographically-"signed" decision lock with status LOCKED and
    R0 = 0.92 from the composed endpoint. Only a consumer who separately
    inspects `rebacResult.decision` is safe; the lock artifact itself
    asserts consensus approval. -/
theorem cex_deny_yet_locked :
    composedLock true false false false false false false false =
      (.deny, .locked) := by
  decide

end SovereignMesh
