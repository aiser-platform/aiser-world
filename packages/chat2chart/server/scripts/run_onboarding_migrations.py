"""
Run Onboarding Enhancements Migration
Executes SQL migration for onboarding and pricing enhancements
"""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import async_session
from sqlalchemy import text


async def run_migration():
    """Execute onboarding enhancements migration"""
    migration_file = Path(__file__).parent.parent / "database" / "migrations" / "add_onboarding_enhancements.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration file: {migration_file}")
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
    
    # Split by semicolons and execute each statement
    statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    print(f"🔧 Executing {len(statements)} SQL statements...")
    
    async with async_session() as db:
        try:
            for i, statement in enumerate(statements, 1):
                if statement:
                    try:
                        await db.execute(text(statement))
                        print(f"  ✅ Statement {i}/{len(statements)} executed")
                    except Exception as e:
                        # Some statements might fail if columns/tables already exist
                        error_str = str(e).lower()
                        if "already exists" in error_str or "duplicate" in error_str or "if not exists" in error_str:
                            print(f"  ⚠️  Statement {i}/{len(statements)} skipped (already exists)")
                        else:
                            print(f"  ❌ Statement {i}/{len(statements)} failed: {str(e)}")
                            raise
            
            await db.commit()
            print("✅ Migration completed successfully!")
            return True
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    print("🚀 Starting Onboarding Enhancements Migration...")
    success = asyncio.run(run_migration())
    sys.exit(0 if success else 1)

