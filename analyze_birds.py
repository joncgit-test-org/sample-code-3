#!/usr/bin/env python3
"""
Cross-repository analysis script to identify birds listed in birds.md files
from joncgit-test-org/sample-code-1 and joncgit-test-org/sample-code-2 repositories.
"""

import requests
import sys
import base64
import os


def fetch_file_from_github(org, repo, file_path, branch='main'):
    """
    Fetch a file from a GitHub repository using the GitHub API.
    
    Args:
        org: GitHub organization name
        repo: Repository name
        file_path: Path to the file in the repository
        branch: Branch name (default: 'main')
    
    Returns:
        The content of the file as a string, or None if not found
    """
    url = f"https://api.github.com/repos/{org}/{repo}/contents/{file_path}?ref={branch}"
    
    # Check for authentication token
    headers = {}
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    if token:
        headers['Authorization'] = f'token {token}'
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            content = base64.b64decode(data['content']).decode('utf-8')
            return content
        elif response.status_code == 404:
            # Try with 'master' branch if 'main' didn't work
            if branch == 'main':
                return fetch_file_from_github(org, repo, file_path, branch='master')
            return None
        else:
            print(f"Error fetching {repo}/{file_path}: HTTP {response.status_code}")
            return None
    except Exception as e:
        print(f"Exception while fetching {repo}/{file_path}: {str(e)}")
        return None


def parse_birds_from_content(content):
    """
    Parse bird names from the content of a birds.md file.
    
    Args:
        content: The content of the birds.md file
    
    Returns:
        A list of bird names found in the file
    """
    if not content:
        return []
    
    birds = []
    lines = content.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        # Skip empty lines, headers, and markdown formatting
        if line and not line.startswith('#'):
            # Remove markdown list markers (-, *, +, numbers)
            if line.startswith(('- ', '* ', '+ ')):
                bird = line[2:].strip()
            elif line[0].isdigit() and '. ' in line:
                bird = line.split('. ', 1)[1].strip()
            else:
                bird = line
            
            if bird:
                birds.append(bird)
    
    return birds


def main():
    """Main function to fetch and analyze birds.md files from both repositories."""
    
    org = "joncgit-test-org"
    repos = ["sample-code-1", "sample-code-2"]
    file_path = "birds.md"
    
    print("=" * 80)
    print("Cross-Repository Bird Analysis")
    print("=" * 80)
    print()
    
    all_results = {}
    
    for repo in repos:
        print(f"Fetching {file_path} from {org}/{repo}...")
        content = fetch_file_from_github(org, repo, file_path)
        
        if content:
            birds = parse_birds_from_content(content)
            all_results[repo] = birds
            print(f"✓ Found {len(birds)} bird(s) in {repo}")
        else:
            all_results[repo] = []
            print(f"✗ Could not fetch {file_path} from {repo}")
        print()
    
    # Display results
    print("=" * 80)
    print("RESULTS")
    print("=" * 80)
    print()
    
    for repo, birds in all_results.items():
        print(f"Birds in {org}/{repo}:")
        if birds:
            for i, bird in enumerate(birds, 1):
                print(f"  {i}. {bird}")
        else:
            print("  (No birds found or file not accessible)")
        print()
    
    # Show unique and common birds
    if all_results[repos[0]] and all_results[repos[1]]:
        set1 = set(all_results[repos[0]])
        set2 = set(all_results[repos[1]])
        
        common = set1 & set2
        only_in_1 = set1 - set2
        only_in_2 = set2 - set1
        
        print("-" * 80)
        print("COMPARISON")
        print("-" * 80)
        print()
        
        if common:
            print(f"Birds in both repositories ({len(common)}):")
            for bird in sorted(common):
                print(f"  • {bird}")
            print()
        
        if only_in_1:
            print(f"Birds only in {repos[0]} ({len(only_in_1)}):")
            for bird in sorted(only_in_1):
                print(f"  • {bird}")
            print()
        
        if only_in_2:
            print(f"Birds only in {repos[1]} ({len(only_in_2)}):")
            for bird in sorted(only_in_2):
                print(f"  • {bird}")
            print()


if __name__ == "__main__":
    main()
