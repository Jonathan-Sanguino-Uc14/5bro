# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Expo 57 · Expo Router · React Native 0.86 · react-native-reanimated 4.5 · TypeScript · targets iOS, Android, and web static from the same codebase.

## Users

Small business owners and solo entrepreneurs who track their daily sales, purchases, and expenses on their phone while actively working. The primary use case is registering a sale in seconds during a busy workday, then reviewing totals and trends at day's end. Single-user per account; each user sees only their own data.

## Product Purpose

A mobile-first financial ledger for small businesses, with an AI assistant that explains the numbers in plain language. The product replaces manual notebooks, spreadsheets, or memory with fast digital records that generate automatic summaries and honest financial estimates. Success means the user can register a sale in a few taps and understand their business health without needing accounting knowledge.

## Positioning

An AI-assisted financial tracker that is honest about what it knows: estimates are always labeled "estimated," comparisons are only shown when real historical data exists, and the AI assistant only reasons from the data that was actually recorded — it never fabricates figures.

## Operating Context

- Primary device: mobile (iOS/Android), used in the middle of active work (at a stall, in a store, between tasks).
- Secondary: web for reviewing metrics on desktop.
- Typical session: register one operation in under 30 seconds; check daily totals; ask the AI a quick question.
- Internet connectivity is variable; the v1 product may require connectivity but must clearly communicate when it is unavailable.
- Amounts stored as integers in cents to avoid rounding errors.
- Dates stored in a standard format (ISO 8601), displayed in the user's local timezone.

## Capabilities and Constraints

### Auth
- Email + password registration and login.
- Password recovery by email.
- Persistent session (user stays logged in across app restarts).
- Biometric login (fingerprint / Face ID).
- Sign in with Google.
- Sign out.
- Delete account and all associated data.
- Profile screen: business name and currency.
- Row-level security: each user's data is isolated at the database level, not only in the UI.

### Operation Registration
- Three types: sale (venta), purchase (compra), expense (gasto).
- Fields: type, concept (free text, required), amount (required, > 0), date (default: today), note (optional), category (short fixed list: mercancía, transporte, comisiones, otros + user-defined).
- Sales: optional quantity + unit price → amount calculated automatically.
- Quick-entry form optimized for speed (few taps); numeric keypad for amount.
- Validations: amount > 0; concept not empty; no invalid dates.
- Success confirmation and clear error messages.
- Repeat a previous operation in one tap.

### Operation History
- List sorted newest to oldest.
- Each row: concept, type, date, amount (+ for income, − for expenses).
- Filter by type (all, sales, purchases, expenses).
- Filter by date range (today, week, month, custom range).
- Search by concept.
- Edit an operation.
- Delete an operation with confirmation.
- Empty state message when no operations exist.
- Paginated / virtualized loading for large lists.

### Financial Metrics
- Period selector: today, week, month.
- Totals: sales, purchases, expenses for the period.
- Estimated profit: sales − (purchases + expenses); always labeled "estimada"; with a note explaining it depends on what was recorded.
- Operation count for the period.
- Sales-per-day or sales-per-week chart.
- Period-over-period comparison only when prior-period data exists; never show a fabricated percentage.
- Warning when data is too sparse for conclusions.
- Top-selling product or concept.
- Largest expense of the month.
- Numbers must always reconcile with the history list.

### AI Financial Assistant
- Chat screen for natural-language questions about the business.
- Plain-language explanations of the numbers.
- Suggestions based only on recorded data.
- Suggested starter questions ("¿Cuánto gané este mes?").
- Typing indicator while the AI is responding.
- The app computes a business summary (totals, comparisons, days with no records) and sends it with the question; the AI does not compute figures.
- API key is never bundled in the app; a cloud function proxies requests to the AI service.
- System instructions for the AI: use only provided data; say when data is missing; never present an estimate as confirmed profit; never fabricate figures; decline fiscal or legal advice and say so clearly.
- Daily question limit per user to control cost.
- Error handling for no internet, slow response, or service outage — with a clear message.
- Conversation history (can be stored on device).
- Button to clear conversation.

### Offline Behavior
- v1 may require internet; must display a clear notice when offline.
- Future: offline operation registration with sync on reconnect.

### Settings
- Business name.
- Currency.
- Custom categories (add and remove).
- Change password.
- Sign out.
- Delete account.
- About / version.
- Daily reminder to log the day's sales.

### Data & Security
- Amounts as integer cents.
- Dates as ISO 8601, displayed in user's local timezone.
- Passwords handled by the auth service; never stored in plaintext.
- All connections over HTTPS.
- Row-level security rules so users cannot read each other's data.
- Privacy policy and terms of use (required for app store publication; the data is financial).
- Automatic database backup.
- Export operations to CSV.

## Brand Commitments

Product name is undecided (working folder: leticIA). No visual identity committed yet.

## Evidence on Hand

No real user data, testimonials, or marketing assets. Codebase is at the Expo starter template stage. Future work must not fabricate usage statistics or customer quotes.

## Product Principles

1. **Register fast, review later.** The operation entry flow is optimized for speed above all else — a user mid-sale cannot wait.
2. **Honest numbers only.** Estimates are labeled estimates. Comparisons only appear with real data. The AI only uses what was recorded.
3. **Native where native matters.** iOS and Android surfaces follow OS conventions; the app earns trust by feeling like it belongs on the device.
4. **Security at the data layer.** Isolation between users is enforced by database rules, not UI logic. The AI key never ships in the client.
5. **Progressive capability.** v1 can require internet; the architecture must allow offline sync to be added later without redesign.

## Accessibility & Inclusion

Numeric amounts must be screen-reader accessible. Biometric login is an enhancement, not the only path in.
