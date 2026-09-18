# The Lucid’s Way — production requirements

Source: “the lucidsway webdev 2026.pdf”, 10 pages, reviewed 15 September 2026.
This checklist describes the requested product. It does not imply that the static prototype implements these capabilities.

## Product and public pages

- Multi-city brand using the supplied logo, photos and videos; mobile-first public experience.
- Home: header, hero, introduction, upcoming events, previous events, supporting sections, footer.
- Published event cards: name, date, city/location, media, description and a direct event link.
- Shareable `/events/{slug}/` page: description, date/time/timezone, venue, Maps URL, media, configurable passes, registration, coupon, referral and checkout.
- Past event pages: date, description and media galleries.
- Configurable official WhatsApp number and prefilled message; do not ship an invented number.
- Public About, Contact, Terms, Privacy, Refund/Cancellation, Digital Delivery and Customer Support pages linked from every public footer.

## Event and registration management

- Admin manages event publication, city, timezone, venue, media and pass configuration.
- One or multiple passes per event, integer minor-unit prices (INR paise), sales windows and capacity.
- Required name, WhatsApp number, email and pass; event-specific additional fields.
- Server validates input and calculates totals. Browser-supplied prices are never authoritative.
- Prevent duplicate active registrations by event/customer identity; permit retrying failed or expired attempts without creating duplicate tickets.
- Store immutable event/pass/price snapshots for each order so later edits do not rewrite purchased tickets.
- Display event-specific refund terms before checkout, require explicit acceptance and store the accepted policy text and event version with the order.
- Track pending, paid, failed, expired, cancelled and refunded states separately from ticket entry status.

## Coupons and referrals

- Percentage and fixed-amount coupons, event scope, expiry, minimum subtotal, global usage limit and per-customer limit.
- Check limits during transactional reservation, not only on the quote screen.
- Release held capacity and coupon reservations when checkout expires; retries must be idempotent.
- Referral code/name attached to registration; an unknown free-text referral must not grant dashboard access.
- Reports count verified paid registrations and revenue; refunds must adjust net revenue.

## Payments and tickets

- Gateway adapter: create order on server, verify provider webhook signature, verify captured amount/currency/order ID, deduplicate webhook events.
- A browser checkout-success callback is not proof of payment.
- Only verified payment creates one ticket per purchased pass, plus an email delivery job.
- Failed/delayed/replayed/out-of-order webhooks require reconciliation and explicit handling.
- Ticket contains name, event, time, venue, pass, reference and QR.
- QR carries an opaque high-entropy token, never customer data. Store its hash.
- Staff scanner requires authentication and event assignment. Atomic conditional redemption allows exactly one successful entry.
- Scan response: valid/used/invalid, event and permitted customer/pass details. Invalid tokens must not expose unrelated records.
- Refund/cancellation invalidates entry; audit every staff redemption.

## Roles and administration

| Role | Access |
| --- | --- |
| Owner/admin | All events, staff, volunteer accounts, coupons, registrations, reports and exports |
| Organiser | Only explicitly assigned events and granted operations; may add or remove volunteers for those events |
| Entry staff | Validate/redeem tickets only for assigned events |
| Volunteer | Own assigned referral link/code and own event-level performance; no general customer directory |
| Customer | Own registration/ticket through authenticated or secure scoped access |

- Volunteers are provisioned by an administrator using approved domain emails; knowing an email domain alone must not grant access.
- Organiser event scoping is enforced by backend queries and permissions from the first release.
- Export registrations as CSV, with event authorisation and spreadsheet-formula injection protection.
- Customer PII, payment status, coupon usage, ticket status and referral reports managed in backend.

## Release acceptance gates

- Price tampering cannot alter charge or issue a ticket.
- Two simultaneous requests cannot oversell the last pass or last coupon use.
- Replaying payment events cannot issue another ticket or confirmation job.
- Concurrent scans of one token produce one successful entry.
- Organiser A cannot read, export or scan Event B; volunteer A cannot view volunteer B.
- Failed email delivery is retryable without creating another ticket.
- Registration and checkout work on mobile with reduced motion, keyboard navigation and clear validation errors.
- Real business details, approved policy copy, gateway test/live credentials, transactional email delivery and backup/restore are verified before launch.

## Current baseline

Node.js serves the existing design with a Hostinger-compatible MySQL-backed catalogue, authenticated event/pass editor, event-scoped organiser authorisation, database migrations and audit records. Authenticated registration, event-specific refund terms and acceptance snapshots, server-priced capacity reservations, coupons, referrals, Razorpay order/signature/webhook handling, transactional ticket issuance, private QR display, one-time scanning and a delivery outbox are implemented. Validated event uploads are stored in MySQL so they survive application redeployments. Integration tests cover isolation, validation, private drafts, policy consent, session revocation, discounts, signed tickets and transactional rollback. The static preview remains available separately.

Paid checkout remains disabled until Razorpay Test Mode credentials, its webhook secret and a ticket-signing secret are configured. Public compliance pages, business contact details and the MegMultiMedia Pvt Ltd footer attribution are implemented; the organiser’s public name and final business approval of all policy terms are still required. Provider reconciliation/refund handling, expiration cleanup, the email-delivery worker, reporting/CSV exports and payout review are not yet implemented. The production catalogue does not seed sample events. Existing memory galleries remain prototype content pending editorial review.
