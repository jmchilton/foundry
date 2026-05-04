---
type: research
subtype: component
tags:
  - research/component
  - source/nextflow
  - target/galaxy
component: "Nextflow containers and environments"
status: draft
created: 2026-05-01
revised: 2026-05-04
revision: 2
ai_generated: true
summary: "Maps Nextflow container and conda evidence to Galaxy package and container requirements."
related_molds:
  - "[[summarize-nextflow]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[summarize-galaxy-tool]]"
sources:
  - "https://www.nextflow.io/docs/latest/container.html"
  - "https://www.nextflow.io/docs/latest/conda.html"
  - "https://docs.galaxyproject.org/en/latest/dev/schema.html#tool-requirements"
  - "https://docs.galaxyproject.org/en/latest/admin/container_resolvers.html"
  - "https://docs.galaxyproject.org/en/latest/admin/conda_faq.html"
  - "https://galaxy-iuc-standards.readthedocs.io/en/latest/best_practices/tool_xml.html"
  - "https://biocontainers.pro/registry"
---

# Nextflow Containers and Environments

This note maps Nextflow process-level runtime evidence into Galaxy tool XML `<requirements>` evidence. It is for `[[summarize-nextflow]]`, `[[author-galaxy-tool-wrapper]]`, and `[[summarize-galaxy-tool]]` when a source process has container or conda evidence that could explain executable dependencies.

## Decision

Prefer Galaxy package requirements when the Nextflow evidence names Bioconda or conda packages with versions. Add explicit Galaxy container requirements only when the source gives a stable container URI or when package requirements cannot adequately describe the runtime.

The safest default for newly authored Galaxy wrappers is:

```xml
<requirements>
    <requirement type="package" version="0.12.1">fastp</requirement>
</requirements>
```

Use an explicit container only when preserving the exact image matters:

```xml
<requirements>
    <container type="docker">quay.io/biocontainers/fastp:0.12.1--h5e1937b_0</container>
</requirements>
```

Galaxy treats package requirements as abstract dependencies that Conda, environment modules, or other resolvers can satisfy. Galaxy also has mulled container resolvers that derive BioContainers images from package requirements. An explicit `<container>` is narrower: it points Galaxy at one image and bypasses the package-to-container abstraction.

## Evidence Classes

### Directly Emittable

Emit Galaxy package requirements directly when evidence is one of:

- Nextflow `conda` directive with `bioconda::name=version`, `conda-forge::name=version`, or unqualified `name=version` for a known conda package.
- `environment.yml` dependency entries with exact package pins from Bioconda or conda-forge.
- nf-core module `environment.yml` with one primary tool package and exact version.
- Existing Galaxy wrapper requirements from `[[summarize-galaxy-tool]]`; these should be reported as wrapper facts, not remapped.

Emit explicit Galaxy container requirements directly when evidence is one of:

- Fully qualified Docker/OCI image with immutable or versioned tag, for example `quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0`.
- `docker://quay.io/biocontainers/...` or `docker://docker.io/...` where the registry, image, and tag are present.
- Singularity/Apptainer `docker://...` URI that points back to a Docker-compatible registry and tag.

Preserve evidence in summaries even when not emitting it into authored XML. `summarize-nextflow` should keep the raw directive, resolved image, package list, source file, and confidence so `author-galaxy-tool-wrapper` can decide.

### Review Required

Require user or maintainer review when evidence is one of:

- Unversioned package names, including `conda 'samtools'` or `container 'quay.io/biocontainers/samtools:latest'`.
- Docker Hub short names such as `biocontainers/samtools` or `samtools:latest`; these depend on registry defaults and may not match Galaxy resolver expectations.
- Floating tags such as `latest`, `dev`, `master`, date-only tags without package build strings, or branch-like tags.
- `environment.yml` with multiple top-level tools where the process script invokes only one or where transitive libraries dominate the file.
- Pip-only dependencies, CRAN-only packages, custom channels, local package paths, local conda environment directories, or conda lock files where package intent is not obvious.
- Wave-generated images where the URI is stable but the package recipe is not recoverable from local evidence.
- Local Singularity image paths, `file://` URIs, `shub://` URIs, `library://` URIs, or site-specific image caches.
- Containers that bundle private scripts, reference data, license-gated binaries, credentials, or data managers.

Review should answer two questions: whether the package names and versions are the right Galaxy requirements, and whether an explicit container is needed for reproducibility.

## Mapping Rules

### Bioconda Package Pin

Nextflow:

```nextflow
conda 'bioconda::bwa=0.7.17 bioconda::samtools=1.17'
```

Galaxy:

```xml
<requirements>
    <requirement type="package" version="0.7.17">bwa</requirement>
    <requirement type="package" version="1.17">samtools</requirement>
</requirements>
```

Drop the channel prefix in the Galaxy requirement body. Record the channel as evidence or provenance if the output schema has a place for it. Galaxy Conda resolution searches configured channels; the wrapper requirement itself names the abstract package and version.

### Environment File

Nextflow:

```nextflow
conda 'modules/nf-core/fastqc/environment.yml'
```

`environment.yml`:

```yaml
channels:
  - conda-forge
  - bioconda
dependencies:
  - fastqc=0.12.1
```

Galaxy:

```xml
<requirements>
    <requirement type="package" version="0.12.1">fastqc</requirement>
</requirements>
```

If the file includes interpreter/runtime libraries plus one command-line tool, emit the command-line tool and keep the supporting libraries as evidence. If the script imports Python/R libraries directly or runs package-provided scripts, emit those packages too.

### BioContainers URI

Nextflow:

```nextflow
container 'quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0'
```

Galaxy package-first form:

```xml
<requirements>
    <requirement type="package" version="0.12.1">fastqc</requirement>
</requirements>
```

Galaxy exact-container form:

```xml
<requirements>
    <container type="docker">quay.io/biocontainers/fastqc:0.12.1--hdfd78af_0</container>
</requirements>
```

For `quay.io/biocontainers/<name>:<version>--<build>`, the package name is normally `<name>` and the package version is the tag prefix before `--`. This is strong evidence, but still verify against command usage when the image name is generic, multi-tool, or not the executable invoked by the process.

### Docker Hub Aliases

Nextflow:

```nextflow
container 'biocontainers/fastqc:v0.11.9_cv8'
```

Do not emit this directly as a Galaxy package requirement without review. Docker Hub BioContainers tags have historical naming conventions and may not map one-to-one to current Bioconda package pins. Prefer resolving to a current `quay.io/biocontainers/...` image or a Bioconda package pin before authoring XML.

### Singularity and Apptainer URIs

Nextflow:

```nextflow
container 'docker://quay.io/biocontainers/multiqc:1.21--pyhdfd78af_0'
```

Galaxy can express this as Docker or Singularity depending on the target runtime:

```xml
<requirements>
    <container type="docker">quay.io/biocontainers/multiqc:1.21--pyhdfd78af_0</container>
</requirements>
```

or:

```xml
<requirements>
    <container type="singularity">docker://quay.io/biocontainers/multiqc:1.21--pyhdfd78af_0</container>
</requirements>
```

For authored wrappers, prefer package requirements unless the source specifically depends on Singularity behavior or an administrator has requested explicit Singularity images. Local `.sif` paths and site cache paths are not portable Galaxy wrapper requirements.

### Wave Images

Wave can build or resolve images from process dependencies and can emit stable-looking image URIs. Treat a Wave URI as runtime evidence, not package-authoring evidence, unless accompanying metadata exposes the Conda packages or Dockerfile ingredients used to build the image.

Direct use of a Wave image as `<container>` is acceptable only when exact runtime preservation matters and the image is externally pullable by the target Galaxy execution environment. Otherwise, ask for review and try to recover package requirements from the process `conda` directive, nf-core module `environment.yml`, or command invocation.

### Existing Galaxy Wrapper Summaries

`[[summarize-galaxy-tool]]` should not infer new Bioconda equivalences from container names. Existing wrappers are summarized as declared:

- Keep `<requirement type="package">` entries as package facts.
- Keep `<container>` entries as container facts.
- Warn if the wrapper has only an explicit container and no package requirements, because downstream tooling may be less portable.

Equivalence inference belongs to `[[author-galaxy-tool-wrapper]]`, where the Foundry is authoring new XML from source-process evidence.

## Reliability Ladder

Highest confidence:

- Existing Galaxy XML requirements from a selected wrapper.
- Pinned Bioconda/conda-forge package requirements in `conda` or `environment.yml`.
- `quay.io/biocontainers/<package>:<version>--<build>` images whose package name matches the invoked command.

Medium confidence:

- Multi-package `environment.yml` where invoked commands identify the primary tools.
- Singularity/Apptainer `docker://quay.io/biocontainers/...` images.
- nf-core module conventions when `main.nf`, `environment.yml`, and `meta.yml` agree.

Low confidence:

- Docker Hub aliases and floating tags.
- Wave images without build metadata.
- Custom registries, private images, local images, custom channels, pip-only environments, and site-specific environment directories.

## Output Guidance

When summarizing Nextflow evidence, preserve:

- Raw directive value and source location.
- Resolved process name and label selectors that contributed the directive.
- Normalized container registry, namespace, image, tag, and protocol if parseable.
- Parsed conda packages with name, version, channel, and source file.
- Confidence and review reason.

When authoring Galaxy XML, emit:

- Package requirements for reliable conda package evidence.
- Explicit container requirements only for exact stable images or non-conda runtimes.
- A warning when dependency evidence is absent, floating, local, or inconsistent with command usage.

Do not emit:

- `latest` or unpinned package/container versions as if they were reproducible.
- Local filesystem image paths into portable wrappers.
- Transitive library packages unless the process directly invokes or imports them.
- Package names guessed only from executable names without registry evidence.

## Open Gaps

- Need corpus checks over nf-core modules to measure how often `environment.yml`, container tags, and invoked commands disagree.
- Need a normalized field in `summary-nextflow` for package-confidence and container-confidence evidence.
- Need examples from real cast attempts before promoting this from draft to reviewed.
