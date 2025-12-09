# About id_new, new_id, and legacy_id Columns

## The Issue: Duplicate ID Columns

The `users` table currently has **3 ID-related columns**:
1. `id` (UUID) - Primary key
2. `id_new` (UUID) - Duplicate UUID column
3. `new_id` (UUID) - Another duplicate UUID column  
4. `legacy_id` (integer) - Old integer ID for migration compatibility

## Why This Happened

During development, there were multiple migration attempts between:
- Integer IDs → UUID IDs transition
- Different models defining different ID column names
- Copy-paste migrations that added columns without cleaning up

## The Correct Approach

We should have **only**:
- `id` (UUID) - Primary key
- `legacy_id` (integer, nullable) - For tracking old integer IDs during migration

## What We Should Do

1. **In production**: Use a migration to drop `id_new` and `new_id` columns
2. **For now**: Keep them for compatibility but avoid fused columns
3. **Future**: Consolidate to single `id` + optional `legacy_id`

## Current Code Behavior

The login code defensively checks for these columns using `getattr()` with fallbacks:
```python
'id_new': getattr(user_row, 'id_new', None)
'new_id': getattr(user_row, 'new_id', None)
```

This ensures it works regardless of which columns exist.

## Recommendation

For the immediate fix, we're keeping all columns to avoid breaking existing data. In the future, we should:
1. Drop `id_new` and `new_id` via migration
2. Use only `id` (UUID) as primary key
3. Keep `legacy_id` for historical reference

