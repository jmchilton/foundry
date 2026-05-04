# @galaxy-foundry/tests-format-schema

Foundry wrapper for the Galaxy workflow tests JSON Schema from `@galaxy-tool-util/schema`.

## CLI

```sh
validate-tests-format workflow-tests.yml
validate-tests-format workflow-tests.yml --workflow workflow.gxwf.yml --json
```

Exit `0` means the test file is schema-valid and any requested workflow cross-check passed. Exit `3` means validation failed.
