# Cross-Repository Bird Analysis

## Objective
Identify which birds are listed in the `birds.md` files from the following repositories:
- `joncgit-test-org/sample-code-1`
- `joncgit-test-org/sample-code-2`

## Analysis Method

### Automated Analysis
This repository includes a Python script (`analyze_birds.py`) that can automatically fetch and compare the `birds.md` files from both repositories using the GitHub API.

### Usage

```bash
# Run the analysis script
python3 analyze_birds.py
```

The script will:
1. Fetch the `birds.md` file from each repository
2. Parse the bird names from each file
3. Display the birds found in each repository
4. Show a comparison highlighting:
   - Birds common to both repositories
   - Birds unique to each repository

### Requirements
- Python 3.x
- `requests` library (usually pre-installed)

### Authentication
If the repositories are private, the script can be modified to use GitHub authentication by setting a `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN="your_github_token_here"
python3 analyze_birds.py
```

## Results

### Repository: joncgit-test-org/sample-code-1

**Status:** Unable to access (repository may be private or non-existent)

**Birds listed:**
- _To be determined when access is available_

### Repository: joncgit-test-org/sample-code-2

**Status:** Unable to access (repository may be private or non-existent)

**Birds listed:**
- _To be determined when access is available_

## Comparison

### Birds in Both Repositories
- _To be determined_

### Birds Only in sample-code-1
- _To be determined_

### Birds Only in sample-code-2
- _To be determined_

## Notes
- The analysis script attempts to access both repositories using the GitHub API
- Current run indicates repositories are either private or do not exist (403/404 errors)
- Manual verification may be needed with appropriate access credentials
