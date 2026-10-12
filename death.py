#!/usr/bin/env python3
import sys
import subprocess
import argparse
import json

def run_query(sql):
    cmd = ["npx", "wrangler", "d1", "execute", "death", "--remote", "--command", sql, "--json"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        # Parse wrangler JSON output
        output = json.loads(result.stdout)
        if output and isinstance(output, list) and "results" in output[0]:
            return output[0]["results"]
        return []
    except subprocess.CalledProcessError as e:
        print(f"[-] D1 Error: {e.stderr}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError:
        print("[-] Failed to parse wrangler output.", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Death CLI - Edge Bug Bounty Target Manager")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # tree command
    subparsers.add_parser("tree", help="List all unique target file paths")

    # cat command
    cat_parser = subparsers.add_parser("cat", help="Show targets inside a specific file path")
    cat_parser.add_argument("path", help="Exact file path (e.g., h1/android/com.example)")

    # search command
    search_parser = subparsers.add_parser("search", help="Search targets by keyword")
    search_parser.add_argument("query", help="Keyword to search across targets")

    # stats command
    subparsers.add_parser("stats", help="Show total target count and breakdown")

    args = parser.parse_args()

    if args.command == "tree":
        results = run_query("SELECT DISTINCT file_path FROM targets ORDER BY file_path ASC;")
        for row in results:
            print(row["file_path"])

    elif args.command == "cat":
        results = run_query(f"SELECT target FROM targets WHERE file_path = '{args.path}' ORDER BY target ASC;")
        for row in results:
            print(row["target"])

    elif args.command == "search":
        q = args.query.replace("'", "''")
        results = run_query(f"SELECT file_path, target FROM targets WHERE target LIKE '%{q}%' LIMIT 100;")
        print(f"[*] Found {len(results)} results (showing max 100):")
        for row in results:
            print(f"[{row['file_path']}] {row['target']}")

    elif args.command == "stats":
        results = run_query("SELECT COUNT(*) as total, COUNT(DISTINCT platform) as platforms, COUNT(DISTINCT category) as categories FROM targets;")
        if results:
            r = results[0]
            print(f"=== Death Database Stats ===")
            print(f"Total Targets  : {r['total']}")
            print(f"Platforms      : {r['platforms']}")
            print(f"Categories     : {r['categories']}")

    else:
        parser.print_help()

if __name__ == "__main__":
    main()
