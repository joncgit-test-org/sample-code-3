# sample-code-3

## Cross-Repository Bird Analysis Tool

This repository contains tools to analyze and compare bird listings from different repositories in the `joncgit-test-org` organization.

### Features

- Automated fetching of `birds.md` files from specified repositories
- Parsing and listing of bird species
- Cross-repository comparison showing common and unique birds

### Files

- `analyze_birds.py` - Python script to fetch and analyze bird data from GitHub repositories
- `BIRDS_ANALYSIS.md` - Documentation of the analysis results and methodology

### Usage

```bash
# Run the analysis
python3 analyze_birds.py
```

For private repositories, set your GitHub token:
```bash
export GITHUB_TOKEN="your_token_here"
python3 analyze_birds.py
```

### Target Repositories

- `joncgit-test-org/sample-code-1`
- `joncgit-test-org/sample-code-2`

See `BIRDS_ANALYSIS.md` for detailed results and findings.
