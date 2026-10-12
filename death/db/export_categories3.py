#!/usr/bin/env python3
import os
import psycopg2

# Database connection settings
DB_CONFIG = {
    "dbname": "bbscope",
    "user": "postgres",
    "password": "12345678",  # Update if required
    "host": "127.0.0.1",
    "port": "5432"
}

def sanitize_name(name):
    """Sanitize strings for directory/file naming."""
    if not name or name.strip() == "":
        return "uncategorized"
    return name.strip().lower().replace(" ", "_").replace("/", "_")

def main():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
    except Exception as e:
        print(f"[-] Database connection failed: {e}")
        return

    # Retrieve platform, category, and target entries
    query = """
        SELECT p.platform, t.category, t.target
        FROM targets_raw t
        JOIN programs p ON t.program_id = p.id
        WHERE t.target IS NOT NULL AND t.target != ''
        ORDER BY p.platform, t.category, t.target;
    """
    
    print("[*] Fetching targets from database...")
    cur.execute(query)
    rows = cur.fetchall()
    
    exports = {}
    
    for platform, category, target in rows:
        plat = sanitize_name(platform)
        cat = sanitize_name(category)
        
        key = (plat, cat)
        if key not in exports:
            exports[key] = []  # List preserves ALL raw database records
        exports[key].append(target)
        
    print(f"[*] Processing {len(rows)} targets across {len(exports)} platform/category pairs...")

    output_base = "exports"
    
    for (plat, cat), targets in exports.items():
        dir_path = os.path.join(output_base, plat, cat)
        os.makedirs(dir_path, exist_ok=True)
        
        file_path = os.path.join(dir_path, f"{cat}.txt")
        
        with open(file_path, "w", encoding="utf-8") as f:
            for t in targets:
                f.write(f"{t}\n")
                
        print(f"[+] Wrote {len(targets):>5} items -> {file_path}")

    cur.close()
    conn.close()
    print("\n[*] Export complete! Directory tree generated under './exports/'.")

if __name__ == "__main__":
    main()
