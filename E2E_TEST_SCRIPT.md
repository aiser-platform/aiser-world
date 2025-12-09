# End-to-End Test Script for Message Loss & State Fixes

## Quick Test Checklist (5 minutes)

Use this to verify all fixes work together before full manual testing.

### Setup
- [ ] Browser open to http://localhost:3000
- [ ] Backend running (port 8000)
- [ ] No network errors in console
- [ ] Logged in as `admin10@aiser.app` (or your test user)

---

## Test Sequence

### ✅ Test 1: Single Message Persistence (2 min)
**Goal**: Verify messages don't get lost on page refresh

1. [ ] Go to Chat page
2. [ ] Select a data source (e.g., file or warehouse)
3. [ ] Ask a simple question: "Show me the top 5 rows"
4. [ ] Wait for response with chart
5. [ ] **Open DevTools** → **Application** → **LocalStorage**
6. [ ] Look for key: `conv_messages_<current-conversation-id>`
7. [ ] Verify it contains your message and AI response
8. [ ] **Press F5** (refresh page)
9. [ ] **Verify**:
   - [ ] Message appears immediately (from cache)
   - [ ] Chart is visible
   - [ ] No duplicate messages
   - [ ] Timestamp is correct

**Expected**: 1 user message + 1 AI response with chart visible

---

### ✅ Test 2: Data Source Persistence on Screen Switch (2 min)
**Goal**: Verify data source doesn't disappear when navigating

1. [ ] If you have messages, stay in chat
2. [ ] Note the selected data source name (e.g., "customers.csv")
3. [ ] **Click on a different screen** (e.g., Dashboard or Settings)
4. [ ] **Wait 1-2 seconds**
5. [ ] **Come back to Chat**
6. [ ] **Verify**:
   - [ ] Same data source is still selected
   - [ ] No "No data source selected" message
   - [ ] You can immediately ask a new question

**Expected**: Data source name unchanged

---

### ✅ Test 3: Conversation Switch (2 min)
**Goal**: Verify data source restored correctly per conversation

1. [ ] You should have conversation with data source from Test 1
2. [ ] **Click History** or use conversation selector
3. [ ] **Create a NEW conversation** (button or "+" icon)
4. [ ] **Select a DIFFERENT data source** (different file or warehouse)
5. [ ] **Ask a question** in new conversation
6. [ ] **Wait for response**
7. [ ] **Switch back to first conversation** (click on it in history)
8. [ ] **Verify**:
   - [ ] First data source is selected (NOT the second one)
   - [ ] Original message/chart still visible
   - [ ] No state mix-up

**Expected**: Each conversation remembers its own data source

---

### ✅ Test 4: Conversation Deletion (2 min)
**Goal**: Verify delete works and cleanup happens

1. [ ] In history panel or dropdown, find a conversation
2. [ ] **Right-click or hover** to show delete button (trash icon)
3. [ ] **Click Delete** and confirm
4. [ ] **Verify immediately**:
   - [ ] Conversation disappears from history
   - [ ] No error message appears
   - [ ] Success message shows "Conversation deleted"
5. [ ] **Open DevTools** → **Application** → **LocalStorage**
6. [ ] **Search for** `conv_messages_` (should be fewer entries)
7. [ ] **Verify** deleted conversation's cache entries are gone
8. [ ] **Refresh page** (F5)
9. [ ] **Verify**:
   - [ ] Conversation still doesn't appear
   - [ ] Database delete was successful

**Expected**: Conversation removed from UI and caches

---

## Advanced Tests (Optional)

### ✅ Test 5: Rapid Conversation Switching (Stress)
**Goal**: Verify no state cross-contamination

1. [ ] Create 3 conversations with 3 different data sources
2. [ ] Add messages to each
3. [ ] **Rapidly click** between them (A → B → C → A → B in 5 seconds)
4. [ ] **Verify**:
   - [ ] Each shows correct data source
   - [ ] Messages don't mix up
   - [ ] No "loading forever" states

**Expected**: All state correctly separated per conversation

---

### ✅ Test 6: Network Throttle Test
**Goal**: Verify message save works under poor network conditions

1. [ ] **Open DevTools** → **Network tab**
2. [ ] **Set throttle to "Slow 3G"** (or "Fast 3G")
3. [ ] Ask a question in chat
4. [ ] **Monitor Network tab** to see requests:
   - [ ] See `/chat` request
   - [ ] See `/conversations` requests
   - [ ] See message save requests
5. [ ] **Wait for response** (will be slow)
6. [ ] **Verify**:
   - [ ] Message appears
   - [ ] Chart is visible
   - [ ] No errors in console
7. [ ] **Refresh page while response is loading** (risky but tests edge case)
8. [ ] **Verify**:
   - [ ] Messages recovered from cache
   - [ ] No duplicate partial messages

**Expected**: Everything saves correctly even under slow network

---

### ✅ Test 7: Multiple Tabs Test
**Goal**: Verify consistency across browser tabs

1. [ ] Open Chat in **Tab 1**
2. [ ] Open Chat in **Tab 2** (same browser)
3. [ ] In **Tab 1**: Select Data Source A
4. [ ] In **Tab 1**: Ask a question, wait for response
5. [ ] **Switch to Tab 2**
6. [ ] **Verify**:
   - [ ] You see Data Source A (from localStorage, not synced)
   - [ ] Conversation might not be visible yet
7. [ ] **Refresh Tab 2** (F5)
8. [ ] **Verify**:
   - [ ] Data Source A is there
   - [ ] Conversation appears in history

**Expected**: Each tab independent, but uses same localStorage (limitation noted in docs)

---

## Debugging Checklist

If anything fails:

### Check Console for Errors
- [ ] No `Cannot read property 'X'` errors
- [ ] No `Failed to fetch` errors without retry
- [ ] No `JSON.parse` errors (cache corruption)

### Check LocalStorage
Open DevTools → Application → LocalStorage → (your domain)
- [ ] `current_conversation_id` exists and is valid UUID
- [ ] `selected_data_source` has valid JSON with `id` and `name`
- [ ] `conv_messages_<id>` has array of messages
- [ ] No truncated JSON (indicates serialization issue)

### Check Backend Logs
```bash
# If running docker-compose
docker-compose logs -f chat2chart-server | grep -i "saved\|deleted\|error"
```

Look for:
- [ ] `✅ Saved user message immediately`
- [ ] `✅ Saved new AI message to conversation`
- [ ] `✅ Soft deleted conversation X and Y messages`
- [ ] No `❌ Failed to save` messages

### Check Network Requests
DevTools → Network tab, filter for:
- [ ] `/api/conversations` (GET) - loads history
- [ ] `/api/conversations/<id>` (GET) - loads conversation details
- [ ] `/api/conversations` (POST) - creates new conversation
- [ ] `/api/conversations/<id>` (PUT) - updates (saves data source)
- [ ] `/api/conversations/<id>` (DELETE) - deletes conversation

All should return HTTP 200 or 201 (not 405 "Method Not Allowed")

---

## Success Criteria

✅ **All 4 core tests pass** → Core fixes working
✅ **Advanced tests pass** → Edge cases handled
✅ **No console errors** → No regressions introduced
✅ **LocalStorage keys correct** → Data persistence working
✅ **Backend logs show success messages** → Backend changes applied

---

## Rollback Plan

If issues are found:

1. **Message Loss Issue**: Check `langgraph_orchestrator.py` line 282-283 added correctly
2. **Data Source Lost**: Verify `chat/page.tsx` has new useEffect at line 276-296
3. **Delete Not Working**: Verify `services.py` has `rowcount` check at line 344
4. **Frontend Caches Not Clearing**: Check both `SessionHistoryDropdown.tsx` and `HistoryPanel.tsx` delete handlers

---

## Performance Considerations

The fixes should NOT impact performance:

- **Message Save**: No change (still using same async session)
- **Data Source Restore**: One additional API call per conversation switch (acceptable)
- **Delete**: One additional rowcount check (negligible)
- **Cache Clear**: localStorage operations are synchronous but instant

Expected latencies remain:
- User message save: <100ms
- AI response save: <200ms
- Data source restore: <300ms (includes API call)
- Conversation delete: <500ms (includes cascade delete)

---

## Questions & Troubleshooting

### Q: Why does data source reset to "No data source"?
A: Check that the data source still exists. If it was deleted, it won't restore. Select a new one.

### Q: Conversation deleted but reappeared after refresh?
A: This indicates soft delete rowcount check failed. Check backend logs for `rowcount: 0` message.

### Q: Messages appear but charts don't render?
A: Check that chart config is in `echartsConfig` field. See `ChatPanel.tsx` line 422-434 for all possible locations.

### Q: Data source keeps changing when switching conversations?
A: Verify each conversation has its own `json_metadata`. Check DB:
```sql
SELECT id, json_metadata FROM conversation LIMIT 3;
```

Should show different `last_data_source_id` values if conversations used different sources.

