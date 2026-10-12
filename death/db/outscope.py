#!/usr/bin/env python3
import os
import psycopg2

# Database connection settings
DB_CONFIG = {
    "dbname": "bbscope",
    "user": "postgres",
    "password": "12345678",
    "host": "127.0.0.1",
    "port": "5432"
}

OOS_KEYWORDS = ["out_of_scope", "out-of-scope", "oos", "excl", "exclude"]

def check_db_out_of_scope(cur):
    """Check targets_raw for in_scope = 0 and out-of-scope keywords."""
    print("[*] Auditing database tables for out-of-scope entries...")
    
    # Corrected SQL for integer schema (in_scope = 0)
    query = """
        SELECT p.platform, t.category, t.target, t.in_scope
        FROM targets_raw t
        JOIN programs p ON t.program_id = p.id
        WHERE t.target IS NOT NULL AND t.target != '';
    """
    
    try:
        cur.execute(query)
        rows = cur.fetchall()
    except Exception as e:
        print(f"[-] Query failed: {e}")
        return set()

    oos_targets = set()
    total_checked = 0

    for platform, category, target, in_scope in rows:
        total_checked += 1
        target_clean = target.strip()
        
        # Check integer flag: 0 means Out of Scope
        if in_scope == 0:
            oos_targets.add(target_clean)
            continue
            
        # Fallback check for keyword matching
        if any(kw in category.lower() for kw in OOS_KEYWORDS) or any(kw in target_clean.lower() for kw in OOS_KEYWORDS):
            oos_targets.add(target_clean)

    print(f"[+] Total DB targets checked: {total_checked}")
    print(f"[!] Out-of-Scope targets registered (in_scope = 0): {len(oos_targets)}")
    
    return oos_targets

def audit_exported_files(scan_dirs, oos_targets):
    """Scan exported text files across target folders for leaks."""
    found_any_file = False
    leaked_count = 0
    
    for target_dir in scan_dirs:
        if not os.path.exists(target_dir):
            continue
            
        for root, _, files in os.walk(target_dir):
            for file in files:
                if file.endswith(".txt"):
                    found_any_file = True
                    file_path = os.path.join(root, file)
                    
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = [line.strip() for line in f if line.strip()]

                    for line_num, line in enumerate(lines, 1):
                        if line in oos_targets or any(kw in line.lower() for kw in OOS_KEYWORDS):
                            print(f"  [ALERT] Out-of-Scope leak -> {file_path}:{line_num} :: {line}")
                            leaked_count += 1

    if not found_any_file:
        print("[-] No exported .txt files found to scan. Run your export script first!")
    elif leaked_count == 0:
        print("[+] Audit clean! No out-of-scope targets found in export files.")
    else:
        print(f"\n[!] WARNING: Found {leaked_count} out-of-scope targets inside export files!")

def main():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
    except Exception as e:
        print(f"[-] Database connection failed: {e}")
        return

    oos_targets = check_db_out_of_scope(cur)

    print("\n[*] Scanning exported file locations...")
    # Scans both possible relative directories for exports
    audit_exported_files(["exports", "db", "db/exports"], oos_targets)

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
