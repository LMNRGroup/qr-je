# Sanity Check Checklist (5-Minute Manual Test)

## Pre-Test Setup
- [ ] Ensure backend is running and connected to database
- [ ] Ensure frontend is running and connected to backend API
- [ ] Have a test user account ready (or create one)

---

## Part A: Critical Flow Verification

### 1. Auth/Login + Authorized API Calls
**Time: ~30 seconds**

- [ ] **Login/Signup**
  - Navigate to login page
  - Sign in with test account (or create new account)
  - **Expected**: Login succeeds, redirected to main app

- [ ] **Authorized API Call**
  - After login, navigate to Arsenal tab
  - **Expected**: Arsenal list loads without 401 errors
  - Check browser console for any auth errors
  - **Expected**: No "Unauthorized" or "Authorization token required" errors

---

### 2. Arsenal List Loads Fast and Shows Correct Scan Counts
**Time: ~1 minute**

- [ ] **Initial Load**
  - Open Arsenal tab
  - **Expected**: List loads within 2-3 seconds
  - **Expected**: QR codes display with names/content

- [ ] **Scan Counts Display**
  - Check that each QR card shows a scan count number
  - **Expected**: Counts appear (may be 0 for new QRs)
  - **Expected**: Counts are numeric (not "..." or loading state after initial load)

- [ ] **Count Accuracy** (if you have existing scans)
  - Note the count for one QR
  - Scan that QR code (or use redirect URL)
  - Wait 15-20 seconds
  - Refresh Arsenal or wait for auto-refresh
  - **Expected**: Count increments by 1

---

### 3. Public Scan → Redirect → Scan Record Increments
**Time: ~1 minute**

- [ ] **Get Public URL**
  - In Arsenal, select a QR code
  - Copy the short URL (or use the redirect URL format: `/r/:id/:random`)

- [ ] **Test Redirect**
  - Open the URL in a new incognito/private window (or different browser)
  - **Expected**: Redirects to target URL immediately (< 500ms)
  - **Expected**: No errors or 404s

- [ ] **Verify Scan Recorded**
  - Return to main app (Arsenal tab)
  - Wait 15-20 seconds for polling
  - **Expected**: Scan count for that QR increments
  - Check Intel/analytics tab
  - **Expected**: Total scans increases

---

### 4. Intel/Analytics Reads Scan Counts Correctly
**Time: ~1 minute**

- [ ] **Navigate to Intel Tab**
  - Click on Intel/analytics tab
  - **Expected**: Tab loads without errors

- [ ] **Check Summary Stats**
  - **Expected**: Total scans displays correctly
  - **Expected**: Today's scans displays correctly
  - **Expected**: Response time displays (or shows 0 if no data)

- [ ] **Check Trends** (if available)
  - **Expected**: Chart/graph displays (may be empty for new accounts)
  - **Expected**: No console errors

- [ ] **Check Map/Areas** (if available)
  - **Expected**: Map loads or shows "no data" message
  - **Expected**: No errors

---

## Part B: Egress Reduction Verification

### User Upsert Caching
**Time: ~30 seconds**

- [ ] **Check Backend Logs** (if accessible)
  - Make 5-10 rapid requests (navigate between tabs, refresh Arsenal)
  - **Expected**: User upsert should only happen once per 15 minutes per user
  - **Expected**: Subsequent requests within 15 minutes should skip upsert

- [ ] **Functional Test**
  - Login and use the app normally
  - **Expected**: No degradation in auth behavior
  - **Expected**: All authenticated requests still work

---

## Part C: Scan Counts Bulk Endpoint

### Bulk Counts Endpoint
**Time: ~30 seconds**

- [ ] **Network Tab Check**
  - Open browser DevTools → Network tab
  - Navigate to Arsenal
  - **Expected**: See ONE request to `/scans/counts` (not multiple per-QR requests)
  - **Expected**: Response contains a `counts` object with keys like `"urlId:urlRandom"`

- [ ] **Polling Behavior**
  - Stay on Arsenal tab for 1-2 minutes
  - **Expected**: Polling happens every ~45 seconds (not every 15 seconds)
  - **Expected**: When tab is hidden (switch to another tab), polling stops
  - **Expected**: When tab becomes visible again, fresh counts are fetched

- [ ] **Count Accuracy**
  - Create a new QR code
  - Scan it 3 times
  - Check Arsenal
  - **Expected**: Count shows 3 (may take up to 45 seconds to update)

---

## Quick Smoke Tests

### Performance
- [ ] **Initial Arsenal Load**: Should be < 3 seconds
- [ ] **Redirect Speed**: Public scan redirects should be < 500ms
- [ ] **No UI Jank**: Scrolling, selecting QRs should feel smooth

### Error Handling
- [ ] **Offline Behavior**: Disconnect network, try to load Arsenal
  - **Expected**: Shows error message (not infinite loading)
- [ ] **Invalid Token**: Clear localStorage, try to access protected route
  - **Expected**: Redirects to login or shows auth error

---

## Expected Results Summary

✅ **All checks pass**: Implementation is working correctly
⚠️ **Minor issues**: Note them, but core functionality works
❌ **Critical failures**: Stop and investigate before deploying

---

## Notes

- If you see multiple `/urls/:id/:random/scans/count` requests in Network tab, the bulk endpoint migration may not be complete
- If user upsert happens on every request, the cache may not be working
- Scan counts should update within 45 seconds (polling interval), not instantly

---

**Total Estimated Time: ~5 minutes**
