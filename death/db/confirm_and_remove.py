#!/usr/bin/env python3
import os
import sys
import argparse
import shutil

def prompt_user(item: str, file_path: str) -> str:
    """Prompts user for action on a target match."""
    while True:
        choice = input(f" -> Remove '{item}' from {os.path.basename(file_path)}? [y]es / [n]o / [a]ll / [q]uit: ").strip().lower()
        if choice in ['y', 'yes']:
            return 'y'
        elif choice in ['n', 'no']:
            return 'n'
        elif choice in ['a', 'all']:
            return 'a'
        elif choice in ['q', 'quit']:
            return 'q'
        print("Invalid response. Enter 'y', 'n', 'a', or 'q'.")

def sanitize_file(file_path: str, targets_to_remove: set, auto_accept: bool = False, create_backup: bool = True) -> tuple[bool, bool]:
    """
    Reads a file, prompts for confirmation on matching targets, and rewrites the file.
    Returns (auto_accept_state, user_quit_flag).
    """
    if not os.path.isfile(file_path):
        print(f"[-] File not found: {file_path}")
        return auto_accept, False

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        cleaned_lines = []
        removed_count = 0
        matches = [line for line in lines if line.strip() in targets_to_remove]

        if not matches:
            print(f"[+] {file_path}: Clean (0 matches found).")
            return auto_accept, False

        print(f"\n[!] {file_path}: Found {len(matches)} matching target(s). Reviewing:")

        for line in lines:
            stripped = line.strip()
            if stripped in targets_to_remove:
                if not auto_accept:
                    choice = prompt_user(stripped, file_path)
                    if choice == 'q':
                        print("[!] Operation aborted by user.")
                        return auto_accept, True
                    elif choice == 'a':
                        auto_accept = True
                        removed_count += 1
                        print(f"    [-] Removing '{stripped}' (auto-accepting all remaining)")
                    elif choice == 'y':
                        removed_count += 1
                        print(f"    [-] Removing '{stripped}'")
                    else:  # choice == 'n'
                        cleaned_lines.append(line)
                        print(f"    [+] Kept '{stripped}'")
                else:
                    removed_count += 1
                    print(f"    [-] Auto-removing '{stripped}'")
            else:
                cleaned_lines.append(line)

        if removed_count > 0:
            if create_backup:
                backup_path = file_path + ".bak"
                shutil.copyfile(file_path, backup_path)
                print(f"    [*] Backup saved to {backup_path}")

            with open(file_path, "w", encoding="utf-8") as f:
                f.writelines(cleaned_lines)
            print(f"    [+] Updated {file_path} ({removed_count} line(s) removed)\n")
        else:
            print(f"    [*] No changes made to {file_path}\n")

    except Exception as e:
        print(f"[-] Error processing {file_path}: {e}")

    return auto_accept, False


def load_targets(target_input: str) -> set:
    """Loads target strings from file path or comma-separated string."""
    targets = set()
    if os.path.isfile(target_input):
        with open(target_input, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                item = line.strip()
                if item:
                    targets.add(item)
    else:
        for item in target_input.split(","):
            if item.strip():
                targets.add(item.strip())
    return targets


def main():
    parser = argparse.ArgumentParser(
        description="Interactively review and confirm out-of-scope targets before removing."
    )
    parser.add_argument(
        "-f", "--file", required=True, help="Path to text file or directory to process"
    )
    parser.add_argument(
        "-o", "--outscope", required=True, help="File containing list of out-of-scope lines OR comma-separated string"
    )
    parser.add_argument(
        "-y", "--yes", action="store_true", help="Automatically accept all removals (bypass interactive prompts)"
    )
    parser.add_argument(
        "--no-backup", action="store_true", help="Disable creation of .bak safety backup files"
    )

    args = parser.parse_args()

    targets_to_remove = load_targets(args.outscope)
    print(f"[*] Loaded {len(targets_to_remove)} potential target patterns to audit.")

    auto_accept = args.yes
    create_backup = not args.no_backup

    if os.path.isdir(args.file):
        for root, _, files in os.walk(args.file):
            for file in files:
                if file.endswith(".txt"):
                    full_path = os.path.join(root, file)
                    auto_accept, user_quit = sanitize_file(
                        full_path, targets_to_remove, auto_accept=auto_accept, create_backup=create_backup
                    )
                    if user_quit:
                        sys.exit(0)
    else:
        sanitize_file(args.file, targets_to_remove, auto_accept=auto_accept, create_backup=create_backup)


if __name__ == "__main__":
    main()
