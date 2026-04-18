## Plan: Squeeze Native Image Preflight + Docs + Web Playground

Squeeze is a JavaScript package powered by Rust for image budget enforcement and optimization. It ships as a CLI + JS API for local dev/CI, plus a local web playground using the same Rust core compiled to WASM, and a documentation site built with Fumadocs.

Recommended architecture: one shared Rust core crate for all optimization logic, with two adapters:

- Node adapter via napi-rs for CLI and JS package runtime.
- Web adapter via wasm-bindgen for browser/local web UI.

This keeps behavior consistent across CLI, programmatic API, and web playground.

**Steps**

1. Phase 1: Scope and Product Contracts
1. Lock v1 scope:
1. one-shot scan/check/fix CLI (no watch mode)
1. side-by-side output default
1. configurable policy chain (convert, compress, optional resize fallback)
1. Define acceptance for canonical case:
1. input 2MB PNG
1. target format webp only
1. max size 500KB
1. output compliant webp or explicit non-compliance reason.
1. Lock exit code contract:
1. 0 success or no violations
1. 1 unresolved violations
1. 2 runtime/config/internal error.
1. Lock config schema fields and defaults:
1. include paths
1. ignore globs
1. max size KB
1. allowed output formats
1. output strategy
1. quality floor
1. max compression iterations
1. resize fallback policy.

1. Phase 2: Monorepo and Package Topology
1. Create workspace layout:
1. packages/squeeze for npm package + CLI
1. crates/squeeze-core for shared Rust logic
1. crates/squeeze-napi for Node adapter
1. crates/squeeze-wasm for WASM adapter
1. apps/playground for local web app
1. apps/docs for Fumadocs site.
1. Configure Rust workspace and JS workspace tooling.
1. Define versioning and release flow for npm package and docs.

1. Phase 3: Shared Rust Core (Source of Truth)
1. Implement core domain types:
1. image metadata
1. optimization policy
1. per-attempt trace
1. per-file result
1. aggregate summary.
1. Implement deterministic scanner:
1. recursive traversal from include roots
1. ignore filtering
1. supported format detection.
1. Implement optimization engine pipeline:
1. format normalization (for example png to webp)
1. adaptive quality search with bounded iterations
1. optional resize fallback with min dimension guards.
1. Implement safe output naming and collision handling rules.
1. Implement stable error taxonomy with reason codes for JS and web consumers.

1. Phase 4: Node Adapter (napi-rs) and JS API
1. Expose Rust core via napi-rs functions:
1. scanImages
1. checkImages
1. optimizeImage
1. optimizeBatch.
1. Keep interop payloads plain data only:
1. strings
1. numbers
1. booleans
1. arrays
1. flat objects.
1. Implement JS wrapper in packages/squeeze:
1. config loader + normalization
1. native binding invocation
1. typed result mapping.
1. Publish TS types for public API contracts.

1. Phase 5: CLI Design and Runtime Flow
1. Implement CLI commands:
1. squeeze check
1. squeeze fix
1. squeeze scan (optional informational mode).
1. Implement CLI config precedence:
1. explicit --config
1. squeeze.config.json
1. package.json squeeze field
1. defaults.
1. CLI execution flow:
1. parse args
1. resolve config
1. invoke JS API
1. render human table summary
1. optionally emit --json report
1. set exit code.
1. Add dry-run option for fix mode.
1. Add deterministic machine-readable JSON schema for CI/agents.

1. Phase 6: WASM Adapter and Local Web Playground
1. Compile squeeze-core into squeeze-wasm using wasm-bindgen.
1. Expose browser-safe operations:
1. inspect image metadata
1. optimize in memory using ArrayBuffer input
1. return optimized bytes + report.
1. Build apps/playground (local web app):
1. drag and drop images
1. policy controls (target format, max KB, fallback policy)
1. before/after preview
1. size delta and quality diagnostics
1. downloadable optimized output.
1. Ensure playground behavior matches CLI policy semantics and reason codes.
1. Document known differences between browser and filesystem modes.

1. Phase 7: Docs Site with Fumadocs
1. Build docs site in apps/docs with Fumadocs.
1. Include guides:
1. quickstart (install and first run)
1. config reference
1. policy chain behavior
1. CLI examples
1. JS API examples
1. web playground usage
1. troubleshooting and failure reasons.
1. Add architecture page:
1. JS layer responsibilities
1. Rust core responsibilities
1. Node adapter vs WASM adapter
1. release packaging model.
1. Add CI integration page with actionable snippets.

1. Phase 8: Testing, Benchmarks, and Validation
1. Rust unit tests for decision logic, convergence, and fallback outcomes.
1. NAPI integration tests for CLI/API result contracts and exit codes.
1. WASM tests for in-memory optimization correctness.
1. Fixture-based golden tests:
1. oversized png to webp under threshold
1. impossible target returns deterministic failure reason.
1. Idempotency tests for repeat fix runs.
1. Benchmark suite comparing JS baseline vs Rust core throughput.

1. Phase 9: Packaging and Release Automation
1. Configure optional dependency packages for prebuilt binaries:
1. macOS arm64/x64
1. Linux arm64/x64.
1. Configure release CI:
1. build and publish napi artifacts
1. publish npm package
1. build/deploy docs.
1. Add local smoke checks before publish:
1. package install in clean sample project
1. CLI check/fix run on fixture repo.

**How JS and Rust Talk (Detailed Runtime Contracts)**

1. CLI to JS layer
1. CLI parses args and resolves effective config.
1. CLI calls JS API function with normalized config object.

1. JS to NAPI layer
1. JS imports generated native binding loader.
1. JS forwards config and paths as plain objects.
1. JS receives typed response objects and maps them to output schemas.

1. NAPI to Rust core
1. NAPI adapter validates input shape and converts to core structs.
1. Adapter invokes squeeze-core scan/check/optimize services.
1. Adapter converts core result and errors back to JS-safe objects.

1. Web to WASM layer
1. Playground reads uploaded file bytes in browser.
1. Web app passes bytes + policy to WASM exports.
1. WASM adapter maps bytes and policy into squeeze-core compatible structs.
1. WASM returns optimized bytes + report.
1. UI renders preview and allows download.

Design rule: both NAPI and WASM adapters must only orchestrate conversion at boundaries; all optimization policy logic lives in squeeze-core.

**CLI Contract (v1 Draft)**

1. squeeze check --paths <glob|dir> --max-kb 500 --formats webp --json
1. squeeze fix --paths <glob|dir> --max-kb 500 --formats webp --policy compress,resize --dry-run
1. squeeze scan --paths <glob|dir>

Behavior:

1. check never writes files, only reports violations.
1. fix writes side-by-side outputs by default using configurable suffix.
1. unresolved files include reason codes (for example QUALITY_FLOOR_REACHED).
1. JSON mode always emits stable schema suitable for CI parsing.

**Step-by-Step Action Items (Execution Checklist)**

1. Write squeeze config schema and result schema docs first.
1. Scaffold monorepo structure and Rust workspace crates.
1. Implement squeeze-core scanner and metadata extraction.
1. Implement check-only flow and expose via napi-rs.
1. Build CLI check command with exit codes and JSON mode.
1. Implement conversion + compression stages in squeeze-core.
1. Implement optional resize fallback and safeguards.
1. Implement safe side-by-side output writer.
1. Add fix command and dry-run behavior.
1. Add WASM adapter and playground MVP with drag/drop.
1. Stand up Fumadocs site and wire docs from real command examples.
1. Add fixtures, integration tests, and benchmark harness.
1. Add release pipeline and publish candidate alpha.

**Relevant files (planned)**

- /Users/macbook/Desktop/work/frontend-stuff/js-rust/plan.md — canonical project blueprint in workspace.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/packages/squeeze/package.json — npm metadata, scripts, optionalDependencies, bin.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/packages/squeeze/src/index.ts — JS API wrapper over native bindings.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/packages/squeeze/src/config.ts — config discovery, merge, validation.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/packages/squeeze/bin/squeeze.js — CLI entry and output handling.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/crates/squeeze-core/src/lib.rs — shared optimization engine.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/crates/squeeze-core/src/scanner.rs — traversal and eligibility.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/crates/squeeze-core/src/engine.rs — convert/compress/resize pipeline.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/crates/squeeze-core/src/report.rs — deterministic result schema.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/crates/squeeze-napi/src/lib.rs — Node adapter via napi-rs.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/crates/squeeze-wasm/src/lib.rs — WASM adapter via wasm-bindgen.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/apps/playground/src/main.ts — local web playground UI.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/apps/docs — Fumadocs documentation site.
- /Users/macbook/Desktop/work/frontend-stuff/js-rust/.github/workflows/release.yml — binary build, npm publish, docs deploy.

**Verification**

1. Canonical case passes: 2MB png becomes compliant webp <= 500KB or deterministic failure reason.
1. check mode returns exit code 1 on unresolved violations.
1. fix mode produces side-by-side outputs and stable JSON reports.
1. WASM playground output matches CLI engine decisions for same policy input.
1. Re-running fix is idempotent for already compliant outputs.
1. Supported platform install selects correct optional binary package.

**Decisions**

- Project name: Squeeze.
- v1 includes: CLI + JS API + docs + local web playground.
- v1 excludes: watch mode.
- Docs stack: Fumadocs.
- Web strategy: same Rust core via WASM adapter.
