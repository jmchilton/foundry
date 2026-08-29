# @galaxy-foundry/pi-harness

Pi-backed worker isolation for evaluating published Galaxy Workflow Foundry skills.

The package has two surfaces:

- `runPiSkill()` starts one ephemeral Pi RPC worker with one explicitly loaded skill, a fresh configuration directory, staged declared inputs, and ambient resource discovery disabled.
- `@galaxy-foundry/pi-harness/extension` registers the constrained `foundry_subagent` tool used by a top-level Pipeline skill.

Local mode is process and context isolation, not a security boundary. Container isolation is tracked in [Foundry issue #476](https://github.com/galaxyproject/foundry/issues/476) and is not implemented yet.

## Extension configuration

- `FOUNDRY_SKILLS_DIR` — required path to the installed Foundry skills root.
- `FOUNDRY_RUNS_DIR` — directory for child run records; defaults to a temporary directory.
- `FOUNDRY_WORKER_TIMEOUT_MS` — child wall timeout; defaults to ten minutes.
- `FOUNDRY_SANDBOX` — currently only `local` is accepted.

The trace-mode CLI also accepts `--thinking <level>` when an evaluation should pin Pi's
reasoning level rather than use the model default.

The extension accepts skill names, never arbitrary skill paths. It resolves each name as one direct child of `FOUNDRY_SKILLS_DIR` and starts the child through the same runner used by trace-mode callers.

## License

MIT.
