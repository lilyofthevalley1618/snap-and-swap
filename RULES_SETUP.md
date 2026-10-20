# Firestore rules for Snap & Swap sign-in

Sign-in saves data to `snapswap_users/{uid}` in the same Firebase project as Zapling (`zapling-1492d`).
Saving will fail with "The cloud refused access" until these rules are published. **Nothing has been deployed.**

## Steps (about 3 minutes)
1. Open https://console.firebase.google.com and choose **zapling-1492d**.
2. Go to **Build → Firestore Database → Rules**.
3. Copy the current rules into a note first, so you can undo if needed.
4. Check that the current rules have the Zapling `users/{userId}` block. The proposed file keeps it as it is.
   If the current rules have any other blocks, stop and ask Appy to add them before publishing.
5. Replace all the rules text with the contents of `firestore.rules.proposed`.
6. Click **Publish**.
7. Test: open Zapling and sign in. Your progress should still sync. Then sign in on Snap & Swap and check that Profile says "Synced".

## Also check
- **Authentication → Settings → Authorized domains** includes `lilyofthevalley1618.github.io`.
  Zapling already uses Google sign-in, so it is probably there.
- **Authentication → Sign-in method → Google** is enabled. It already is for Zapling.

## What the rules do
- Each person can read and write only their own `users/{uid}` (Zapling) and `snapswap_users/{uid}/...` (Snap & Swap) data.
- Everything else is blocked.
