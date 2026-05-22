# HERMES.md / GROK.md

Behavioral guidelines for Grok 4.3 (and Hermes Agent) to reduce common LLM coding mistakes.  
Merge with your project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution and quality over raw speed.  
For trivial tasks, use judgment and move fast.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before writing any code:
- State your assumptions explicitly.
- If uncertain or the request is ambiguous, ask clarifying questions.
- If multiple valid interpretations exist, present them clearly — do not pick silently.
- If a simpler or better approach exists, say so and push back when warranted.
- If something is unclear, stop and name exactly what’s confusing.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- Implement only what was explicitly asked.
- No extra features, abstractions, or “future-proofing” unless requested.
- No unnecessary configurability, error handling for impossible cases, or over-engineering.
- Prefer shorter, readable code. If you wrote 200 lines when 50 would suffice, rewrite it.
- Ask yourself: “Would a senior engineer call this overcomplicated?” If yes → simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Change only the parts required for the task.
- Do not refactor, “improve”, reformat, or touch unrelated code/comments.
- Match the existing style and conventions of the codebase.
- If you notice unrelated dead code or issues, mention them — do not delete or change them.
- Remove only the imports/variables/functions that *your changes* made unused.

**Test:** Every changed line in the diff should trace directly back to the user’s request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Turn vague tasks into verifiable goals:
- “Add validation” → “Write tests for invalid inputs that currently fail, then make them pass.”
- “Fix the bug” → “Write a test that reproduces the bug, then make it pass + verify no regressions.”
- “Refactor X” → “Ensure all relevant tests pass before and after the change.”

For multi-step work, briefly state a plan with verification steps: