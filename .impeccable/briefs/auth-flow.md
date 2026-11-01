# Surface Brief — Auth Flow

**Surface:** Login · Register · Forgot Password · Sent Confirmation  
**Mode:** Operate  
**Direction:** Tarjeta de embarque / Boarding Pass  
**Seed:** 677af2738ec13ac1 — challenger vernacular-ephemera-boarding-pass-and-gate-board won both axes

---

## Job and audience

Small business owner on mobile, mid-workday, first-time open or session expired. They need to access their financial ledger in under 30 seconds. Tolerance for friction: low. Trust signal needed: the app must feel reliable and built for commerce, not consumer.

## Outcome

User lands in the main screen (registered or returning) or recovers access via email — no dead ends.

## Selected direction

**Visual authority:** Boarding pass / gate display. Dark gate panel header, ivory stub body, amber primary action, monospace tabular labels. Flat unmodulated color throughout (no gradients). One focused step per screen; no parallel paths visible at once.

**Signature move:** On INGRESAR tap, an amber horizontal scan line sweeps down the form fields before the network call begins — gate-reader moment that confirms the action was received.

**Raises applied:**
- Monospace for all field labels and data (from ikeda-datamatics)
- Flat color everywhere (from aww2-zoo-gardens-guide-map)
- Size as sole hierarchy signal — CTA governs by scale (from star-atlas)
- One step, one screen (from video-feed)

**Palette:** ivory `#F5F3EF` · ink `#1A1A1A` · amber `#F5A623` · muted `#8A8680`

## Scope

- Login, Register, Forgot Password, Sent Confirmation screens
- Supabase email+password auth; Google OAuth placeholder; biometric placeholder
- No onboarding (separate surface)

## States

- Loading: spinner in amber on ivory background before session check resolves
- Error: inline below the offending field in `#C0392B`, monospace label style
- Submitting: button dims to 60% opacity, scan line runs, then nav occurs
- Success: navigate to (app) — no success toast needed (the navigation IS the confirmation)
- Email not confirmed: dedicated message with resend link

## Interaction

- Dark header + perforation divider + ivory body — single scroll view
- Alt gates (Google, biometric) rendered as equal-weight pair below OR divider
- Register link lives in a footer stub below alt gates
- Keyboard avoid: ScrollView with keyboardShouldPersistTaps + contentContainerStyle padding
- No inline show/hide password toggle in v1 (add in polish pass)

## Constraints

- Amounts not touched here; this is identity surface only
- Row-level security configured in Supabase, not in UI
- Google OAuth requires Supabase redirect URL configured — placeholder shown; builder must wire up
- Biometric: use expo-local-authentication; fall back gracefully if unavailable
- Web: expo-secure-store falls back to localStorage for session persistence
