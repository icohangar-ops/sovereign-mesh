# 🎬 Agent Control Plane: 3-Minute Demo Video Script & Storyboard

**Hackathon Track:** *AI Infra Summit Hackathon*  
**Target Duration:** 3 Minutes (180 Seconds)  
**Video Generator Stack:** ffmpeg slideshow + live UI capture

---

## ⏱️ Timeline & Scene-by-Scene Breakdown

```
[0:00 - 0:30] Phase 1: Why agentic apps fail in production
[0:30 - 1:15] Phase 2: Control plane architecture, policy gating, and runtime resilience
[1:15 - 2:05] Phase 3: Live stress demo — retry storm, breaker trip, and consensus lock
[2:05 - 2:40] Phase 4: Signed trace ledger and replayable evidence
[2:40 - 3:00] Phase 5: Conclusion & production impact
```

---

### Scene 1: The Hook — Why production AI fails (0:00 - 0:30)
- **Visuals:** Title slide with the control plane name, failure modes, and a minimal architecture cue.
- **On-Screen Text:** "Retry storms. Unsafe promotions. Missing evidence."
- **Voiceover:**
  > "Production AI systems usually fail in the same three places: tool retries snowball into duplicate work, unsafe promotions slip through, and evidence disappears when people need to review what happened. Agent Control Plane is the missing runtime layer."

---

### Scene 2: The Architecture — Policy, consensus, resilience (0:30 - 1:15)
- **Visuals:** Next.js control plane dashboard showing the policy gate, consensus arena, runtime shield, and signed trace ledger.
- **On-Screen Text:** "Policy Gate • Consensus Hardening • Runtime Shield • Signed Trace Ledger"
- **Voiceover:**
  > "The control plane is built around four layers. The policy gate blocks unsafe actions, consensus hardening forces an adversarial check, the runtime shield keeps retries and breakers under control, and the trace ledger preserves replayable evidence for every decision."

---

### Scene 3: Live Stress Demo — Retry storm and breaker trip (1:15 - 2:05)
- **Visuals (Live UI Capture):**
   1. Click **"Retry Storm on a Flaky Tool Chain"**.
   2. The runtime sees timeouts, repeated attempts, and an unstable downstream tool.
   3. The policy gate and consensus council review the payload and the runtime shield computes breaker state, retry budget, and queue depth.
   4. The decision is blocked or countersigned, and the ledger records a signed trace.
- **Voiceover:**
  > "Now watch the control plane under stress. A retry storm hits a flaky tool chain, the breaker moves to a safe state, and the request either stops cleanly or is forced through a consensus review. The point is not just to block failure, but to make the failure observable and replayable."

---

### Scene 4: Signed Trace Ledger & Replay (2:05 - 2:40)
- **Visuals (Live UI Capture):**
   1. Switch to **"Safe Release With Signed Trace"**.
   2. The request passes the policy gate and reaches the consensus layer.
   3. The runtime shield reports healthy breaker state, queue depth, latency, and error budget.
   4. The trace ledger exports a signed artifact that can be replayed later.
- **Voiceover:**
  > "A healthy request should move fast and leave a trace. The same control plane that blocks unsafe actions also signs the successful ones, so operators can replay the exact path later and see the full evidence chain."

---

### Scene 5: The Future (2:40 - 3:00)
- **Visuals:** Outro slide with the control plane name, hackathon branding, and the three benefits.
- **On-Screen Text:** "Production AI needs policy, resilience, and evidence."
- **Voiceover:**
  > "Agent Control Plane makes AI systems safer to run in production by combining policy, resilience, and evidence in one runtime. That is the infra layer every agentic app needs before it can scale."

---

## 🎨 Google Veo Generation Prompts

```yaml
scene_1_hook:
  prompt: "Cinematic drone shot of modern glass enterprise server architecture at dusk, glowing fiber optic lines running along server racks, subtle holographic security warning HUD overlay, 4k ultra-realistic, moody lighting."
  aspect_ratio: "16:9"
  duration: "5s"

scene_2_control_plane:
  prompt: "Futuristic holographic 3D node network forming a glowing cyber defense shield in deep navy and electric cyan, data packets flowing through nodes, crisp clean visual hierarchy, cinematic lighting."
  aspect_ratio: "16:9"
  duration: "5s"

scene_5_outro:
  prompt: "Elegant rotating 3D metallic shield with a stylized 'S' emblem, illuminated by soft cyan and gold rim lighting, smooth slow-motion camera orbit, professional tech keynote aesthetic."
  aspect_ratio: "16:9"
  duration: "5s"
```
