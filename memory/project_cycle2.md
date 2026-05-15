---
name: project-cycle2
description: Second agile cycle goals, lab meeting feedback, LLM feature scoping decisions
metadata:
  type: project
---

Second cycle started 2026-05-15. Lab meeting showed v0.x prototype; positive reception but two core problems identified.

**Core Problem 1: Transparency Gap**
- Users couldn't tell if catalog modules are fixed classes or extensible abstractions
- Hidden physics (OGS stoichiometry, WaterRS modes, VCCR internals) not surfaced in UI
- Decision: show class hierarchy and per-module functional contracts in UI; do NOT imply custom class creation (BioSim doesn't support it via XML — modules are hardcoded Java classes)

**Core Problem 2: Hidden Physics Gap**
- Transfer logic not visible when wiring modules
- Decision: surface physics via tooltips, a "module encyclopedia," and connection-time validation

**New Feature: LLM Capability**
- Add an LLM-based subsystem to the tool
- Exact interaction model TBD — iterating with user on scope
- No features removed; current functionality is baseline

**Why:** Lab meeting feedback in docs/feedback_v1.md. Second cycle prioritizes understanding/transparency improvements and LLM capability prototype over polish.

**How to apply:** When drafting requirements or architecture, treat module transparency and LLM subsystem as the two new feature pillars. LLM scope must be confirmed with user before implementation.
