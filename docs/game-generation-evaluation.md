# Game generation evaluation

Game Studio has two distinct workflows: the BYOK provider produces bounded command JSON from a task and project context; the local recipe generator produces the same validated command language deterministically from genre, difficulty and seed. Neither applies changes without user review.

## Required automated evidence

- `src/ai/gameGeneration.test.ts`: object alias scoping, atomic rejection, undo, round-trip and two scripted gameplay cases.
- `src/ai/gameGenerationBenchmark.test.ts`: six authored provider-response scenarios covering timed survival, trigger enter/exit, checkpoints/hazards, pushable crates, two-level campaigns and jump rules. Each executes the shared simulation after plan validation.
- `src/ai/localGenerator.test.ts`: actual generation from five supported genres × three representative difficulties × three seeds = 45 independently generated games. Each is normalized, diagnosed and played to a win; timed collection also verifies a losing route, key quests verify counter completion, campaigns verify both stages. Deterministic geometry and invalid configuration checks are separate.
- `e2e/ai-game-generation.spec.ts`: mocked BYOK request, explicit consent, response preview, approval, editor gameplay and exported HTML gameplay.
- `e2e/quick-generator.spec.ts`: offline generator UI, review, opening, gameplay and undo.

The deterministic generator is not an LLM. These tests evaluate the generation pipeline and actual procedural output, not natural-language model success rate or subjective design quality.

## Optional live-provider evaluation

The manual test `scripts/live-ai-evaluation.test.ts` sends only synthetic fixtures to a chosen supported provider, through the actual same-origin loopback gateway. It is deliberately outside the normal CI test path. Live calls may incur API charges, so the operator must opt in and configure a key in their local environment. Never commit credentials or copy them into project files.

Set `GAME_STUDIO_LIVE_AI=1`, `GAME_STUDIO_AI_PROVIDER` to openai, openrouter or anthropic, `GAME_STUDIO_AI_MODEL` to a supported model ID, and the corresponding existing provider environment variable (OPENAI_API_KEY, OPENROUTER_API_KEY or ANTHROPIC_API_KEY). Then run:

```sh
npx vitest run scripts/live-ai-evaluation.test.ts
```

Five actual generation requests are evaluated for valid command plans, structural diagnostics and scripted runtime outcomes: key/gate, timed survival, scoped scoring, two stages and a trigger puzzle. The report `reports/live-ai-evaluation.json` contains only provider/model, case names, categorical outcomes and elapsed times. No API keys, raw generated plans or request bodies are written. A failed case fails the run; do not claim live acceptance until the actual report passes. This is a narrow reproducible regression, not general game-quality certification.
