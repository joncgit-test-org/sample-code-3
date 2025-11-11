#!/usr/bin/env python3
"""
Test script with mock data to demonstrate the bird analysis functionality.
This shows how the script would work if it had access to the repositories.
"""

# Mock data representing what might be in the birds.md files
MOCK_DATA = {
    "sample-code-1": """# Birds in Sample Code 1

- Robin
- Blue Jay
- Cardinal
- Sparrow
- Crow
""",
    "sample-code-2": """# Birds in Sample Code 2

- Robin
- Eagle
- Hawk
- Cardinal
- Owl
"""
}


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
    """Main function to demonstrate bird analysis with mock data."""
    
    print("=" * 80)
    print("Cross-Repository Bird Analysis (DEMO WITH MOCK DATA)")
    print("=" * 80)
    print()
    
    repos = ["sample-code-1", "sample-code-2"]
    all_results = {}
    
    for repo in repos:
        print(f"Processing mock data for joncgit-test-org/{repo}...")
        content = MOCK_DATA.get(repo, "")
        birds = parse_birds_from_content(content)
        all_results[repo] = birds
        print(f"✓ Found {len(birds)} bird(s) in {repo}")
        print()
    
    # Display results
    print("=" * 80)
    print("RESULTS")
    print("=" * 80)
    print()
    
    for repo, birds in all_results.items():
        print(f"Birds in joncgit-test-org/{repo}:")
        if birds:
            for i, bird in enumerate(birds, 1):
                print(f"  {i}. {bird}")
        else:
            print("  (No birds found)")
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
