# Production implementation plan

## Stack decision

The user selected a custom Node.js + MySQL application, superseding the brief's WordPress proposal. The existing static design is retained. Express serves the UI and API; Hostinger MySQL stores users, sessions, event permissions, events, passes and uploaded event images.

The application is configured for Hostinger Business Web Hosting's managed Node.js runtime and local MySQL service. Deploy it through **Add Website → Node.js Web App** using the GitHub repository or a project archive; the earlier FTP destination is not the deployment mechanism for the full application. No production deployment has occurred.

The catalogue/admin foundation, common accounts, event-scoped creator/volunteer assignment, creator-managed volunteer access, pending capacity reservations, coupons, referral wallet ledger, payout requests, Razorpay test-mode adapter, verified ticket issuance, private QR display and the atomic scan boundary are implemented and tested locally. Event-specific refund terms are shown before payment, acceptance is mandatory and an immutable policy snapshot/version is stored with each new order. Gateway credentials are intentionally absent, so paid checkout remains disabled. Provider reconciliation/refunds, the delivery worker and operational reports remain subsequent work.

## Milestones

1. **Event catalogue and admin foundation**: migrations, identity and roles, event-level grants, event/pass CRUD, public published-event API, replace demo catalogue. Validate organiser isolation.
2. **Registration and quote**: configurable form schemas, canonical identity, authoritative pricing, coupon/referral lookup, capacity and coupon reservations, duplicate/retry rules. Validate transactional concurrency.
3. **Payment and ticket lifecycle**: test-mode gateway adapter, signed webhooks, capture verification, idempotency, reconciliation, token issuance, email outbox, ticket page/QR.
4. **Entry and dashboards**: authenticated mobile scanner, atomic redemption, volunteer-owned metrics, organiser event reports, protected CSV exports.
5. **Launch hardening**: real event content, business number and policies, email DNS/deliverability, production gateway review, HTTPS, logs, rate limiting, backups and restore test, device testing.

Each milestone must have working endpoints, UI wiring and meaningful integration tests before being called complete. Stubs and demonstration confirmations must never be presented as production bookings.

## Transaction boundaries

- Quote is advisory and creates no ticket or payment proof.
- Reserve: lock event/pass and applicable coupon usage, revalidate price and sales window, reserve capacity and coupon use, create pending order and immutable snapshot. Use a client idempotency key scoped to the registration attempt.
- Provider order creation: do not hold a database lock during network calls. Reconcile provider errors using the merchant order reference.
- Payment webhook: verify signature on raw body; persist provider event identity; validate captured amount/currency/order. Lock local order, transition exactly once, convert reservations, issue ticket and enqueue delivery in the same transaction.
- Expiry must reconcile ambiguous provider payment state before releasing inventory. A late capture that cannot safely fulfil goes to an explicit exception/refund queue.
- Redeem: update ticket where token hash/event/status match and used_at is null. Exactly one changed row means success. Record staff identity and time in audit log.

## Unresolved business/configuration inputs

- Create the Hostinger MySQL database and deploy a Hostinger Node.js staging website.
- Official business WhatsApp number, sender email and approved volunteer email domain.
- Real upcoming events, passes, capacity, sales windows and extra fields.
- Gateway account/quote and test credentials; use secure server configuration, never committed files.
- Final business approval for event-specific cancellation terms, age/ID language and data retention decisions.
- Who can provision staff/volunteers and whether volunteers see customer identities or only counts/statuses.

## Payment gateway shortlist (reviewed 15 September 2026)

Razorpay is the implemented initial adapter, subject to the business's negotiated quote and account approval. Its published standard domestic gateway pricing is 2% + GST and it supports UPI, cards and net banking. Cashfree is worth requesting a merchant quote from; promotional prices depend on eligible methods/accounts and should not be assumed permanent. Compare actual settlement schedules, refund fees, original fee reversal, chargeback handling and support before enabling live mode. No live gateway account is configured yet.

Sources:
- https://razorpay.com/pricing/
- https://razorpay.com/solutions/e-commerce/
- https://www.cashfree.com/blog/hosted-payment-gateway/
- https://www.cashfree.com/instant-settlements/
