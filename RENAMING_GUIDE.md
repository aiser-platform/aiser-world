# Safe Renaming Guide: Aiser → Aicser

## Overview
This guide provides a systematic approach to safely rename "Aiser" to "Aicser" throughout the codebase while minimizing risks.

## Risk Assessment

### ✅ Safe to Rename
- Display names in UI components
- User-facing text and labels
- Documentation files
- Comments and docstrings
- Brand names in CSS classes
- Package names (if consistent)

### ⚠️ Requires Careful Review
- Database table/column names (requires migration)
- API endpoint paths (breaking change)
- Environment variable names
- Configuration keys
- File paths and directory names
- Import paths in code
- Package.json names
- Docker service names

### ❌ Do NOT Rename
- Git repository name (unless you want to rename the repo)
- Domain names (unless you own the new domain)
- External service names (Azure, AWS resource names)
- Third-party API keys/identifiers
- Database connection strings (if they reference "aiser")
- Existing user data (organization names, etc.)

## Systematic Renaming Strategy

### Phase 1: Preparation
1. **Backup everything**
   ```bash
   git add -A
   git commit -m "Backup before renaming Aiser to Aicser"
   git tag backup-before-rename
   ```

2. **Create a branch**
   ```bash
   git checkout -b rename-aiser-to-aicser
   ```

3. **Document current state**
   - List all files containing "Aiser"
   - Identify database tables/columns
   - Note API endpoints
   - Document environment variables

### Phase 2: Code Renaming (Safe)

#### Option A: Using VS Code / Cursor (Recommended)
1. Open VS Code/Cursor
2. Press `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac)
3. Search for: `Aiser` (case-sensitive: OFF)
4. Replace with: `Aicser`
5. **Review each match** before replacing
6. Use "Replace in Files" with preview

#### Option B: Using Command Line (Automated)
```bash
# Find all occurrences
grep -r "Aiser" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.md" --include="*.json" --include="*.css" .

# Create a script for safe replacement
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.md" -o -name "*.json" -o -name "*.css" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -exec sed -i 's/Aiser/Aicser/g' {} \;
```

### Phase 3: Database Migration (If Needed)

If you have database tables/columns with "aiser" in the name:

```sql
-- Example migration (adjust for your schema)
-- ALTER TABLE aiser_organizations RENAME TO aicser_organizations;
-- ALTER TABLE organizations RENAME COLUMN aiser_id TO aicser_id;
```

**CRITICAL**: Test migrations on a copy of production data first!

### Phase 4: Configuration Files

1. **Environment Variables** (`.env`, `.env.example`)
   ```bash
   # Find and replace
   AISER_* → AICSER_*
   ```

2. **Docker Compose** (`docker-compose*.yml`)
   - Service names
   - Container names
   - Volume names

3. **Package.json** (if package name contains "aiser")
   ```json
   {
     "name": "@aicser/chat2chart"  // if it was @aiser/chat2chart
   }
   ```

### Phase 5: File and Directory Names

```bash
# Rename directories (be careful!)
find . -type d -name "*aiser*" -not -path "*/node_modules/*" -not -path "*/.git/*"

# Rename files
find . -type f -name "*aiser*" -not -path "*/node_modules/*" -not -path "*/.git/*"
```

### Phase 6: Testing Checklist

- [ ] Application starts without errors
- [ ] All imports resolve correctly
- [ ] Database connections work
- [ ] API endpoints respond
- [ ] UI displays "Aicser" correctly
- [ ] No broken references in logs
- [ ] Environment variables load correctly
- [ ] Docker containers start successfully

## Recommended Approach

### For Your Codebase

1. **Start with UI/Display Names** (Safest)
   - UserProfileDropdown.tsx
   - Navigation components
   - Footer/branding components
   - CSS class names

2. **Then Code References** (Medium Risk)
   - Function names
   - Variable names
   - Comments
   - Documentation

3. **Finally Infrastructure** (Higher Risk)
   - Database migrations (if needed)
   - API paths (if you want to change them)
   - Environment variables
   - Docker service names

### Using Cursor/VS Code Find & Replace

**Step-by-step:**

1. **Search First** (Don't replace yet)
   ```
   Ctrl+Shift+F (or Cmd+Shift+F)
   Search: Aiser
   Case sensitive: OFF
   Whole word: OFF (to catch "AiserAI", "AiserPlatform", etc.)
   ```

2. **Review Results**
   - Check each file
   - Identify which are safe to change
   - Note any that need special handling

3. **Replace in Batches**
   - Start with one file type (e.g., `.tsx` files)
   - Test after each batch
   - Commit after successful batch

4. **Test After Each Batch**
   ```bash
   # Run linter
   npm run lint
   
   # Check for TypeScript errors
   npm run type-check
   
   # Test build
   npm run build
   ```

## Files to Prioritize

Based on grep results, start with:
1. `packages/chat2chart/client/src/components/UserProfileDropdown.tsx`
2. `packages/chat2chart/client/src/app/components/AiserAIIcon/AiserAIIcon.tsx`
3. `packages/chat2chart/client/src/app/globals.css`
4. `packages/chat2chart/client/src/styles/*.css`
5. Documentation files (`.md`)

## Rollback Plan

If something breaks:

```bash
# Revert to backup
git checkout backup-before-rename

# Or revert specific files
git checkout HEAD -- path/to/file
```

## Impact Analysis

### Low Impact (Safe)
- UI text: "Powered by Aiser" → "Powered by Aicser"
- CSS classes: `.aiser-*` → `.aicser-*`
- Comments: `// Aiser platform` → `// Aicser platform`

### Medium Impact (Requires Testing)
- Component names: `AiserAI` → `AicserAI`
- Function names: `getAiserConfig()` → `getAicserConfig()`
- Import paths: `@/components/AiserAI` → `@/components/AicserAI`

### High Impact (Requires Migration)
- Database tables: `aiser_organizations` → `aicser_organizations`
- API paths: `/api/aiser/*` → `/api/aicser/*`
- Environment variables: `AISER_*` → `AICSER_*`

## Recommendation

**For your use case (Aiser → Aicser):**

1. ✅ **Safe to do in Cursor/VS Code**: Use Find & Replace for:
   - Display text
   - Component names
   - CSS classes
   - Comments
   - Documentation

2. ⚠️ **Review carefully**:
   - Import paths
   - Function/variable names (ensure no breaking changes)
   - Configuration keys

3. ❌ **Don't change** (unless you have a migration plan):
   - Database schema (requires migration)
   - API endpoint paths (breaking change for clients)
   - Environment variable names (unless you update deployment configs)

## Quick Start Command

```bash
# 1. Create backup branch
git checkout -b backup-before-rename
git add -A && git commit -m "Backup before rename"
git checkout -b rename-aiser-to-aicser

# 2. Find all occurrences
grep -r "Aiser" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build .

# 3. Use VS Code/Cursor Find & Replace with preview
# Search: Aiser
# Replace: Aicser
# Review each match before replacing
```

## Testing After Rename

```bash
# 1. Check for TypeScript errors
cd packages/chat2chart/client && npm run type-check

# 2. Check for lint errors
npm run lint

# 3. Test build
npm run build

# 4. Start dev server
docker-compose -f docker-compose.dev.yml up

# 5. Test critical flows
# - Login
# - Chat interface
# - Data source connections
# - Chart generation
```

## Conclusion

**It's safe to rename** for display/branding purposes using Cursor/VS Code Find & Replace, but:
- Do it in batches
- Test after each batch
- Keep a backup branch
- Review database/API changes separately

The rename should **NOT break functionality** if you:
- Don't change database schema without migration
- Don't change API paths without versioning
- Don't change environment variable names without updating configs
- Test thoroughly after changes


