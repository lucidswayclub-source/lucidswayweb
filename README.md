# The Lucid’s Way

Existing animated UI plus a Node.js/Express + MySQL production foundation. WordPress is not used. The runtime and database are compatible with Hostinger Business Web Hosting.

## Run locally

Requires Node.js 22+ and MySQL 8+. Create an empty application database, copy `.env.example` to `.env`, and set `DATABASE_URL`, `APP_ORIGIN` and `PORT` for your environment.

```sh
npm ci
npm run db:migrate
npm start
```

The current local setup runs at http://localhost:5174 with the shared account dashboard at `/account` (`/admin` is an alias). Local administrator credentials are in `.local/admin-credentials.json`; this file and `.env` are ignored by Git. The separate port 5173 static preview is not the database-backed application.

For a new environment, provision an administrator using `npm run admin:create` with `ADMIN_EMAIL`, `ADMIN_NAME` and a strong `ADMIN_PASSWORD` supplied securely in the environment. Remove these provisioning values afterwards. Never commit credentials.

## Implemented

- Versioned, checksum-verified database migrations.
- Password hashing, expiring server-side sessions, login throttling and mutation origin checks.
- Common customer sign-up and sign-in, with one account for registrations, tickets and staff access.
- Superadmin event/pass editor: draft, publish, archive, prices, capacity, referral rewards and event-specific refund terms.
- Event banners by HTTPS URL or validated JPEG, PNG and WebP upload. Uploaded images are stored in MySQL so Hostinger redeployments do not remove them.
- Warned superadmin deletion for unused events; events with registrations must be archived.
- Superadmin user search and event-scoped creator/volunteer assignment; assigned creators can add or remove scanning volunteers for their own events.
- Creator and volunteer workspaces appear only when that account has an event assignment.
- Server-priced, capacity-checked pending registrations with retry idempotency, mandatory policy consent and an immutable refund-policy snapshot.
- Event-scoped or global coupons with percentage/fixed discounts, expiry and transactional usage limits.
- Razorpay Standard Checkout order creation, server-side signature verification and raw-body webhook validation.
- Payment-event deduplication, transactional ticket issuance and a durable email-delivery outbox.
- Private ticket QR display and event-authorised, atomic one-time redemption.
- Public About, Contact, Terms, Privacy, Refund/Cancellation, Digital Delivery and Customer Support pages linked from the legal footer.
- Personal referral links, pending/available wallet accounting and threshold-gated payout requests.
- Atomic, event-authorised, single-use ticket redemption endpoint.
- Public event API and shareable event pages backed by MySQL.
- Transactional updates, optimistic edit conflict detection and audit records.

Published upcoming events appear in the public catalogue. No sample events are seeded. A private setup-verification draft exists in the local development database.

The public catalogue and event route use an image-led, event-first layout with horizontal event cards on phones and a clear pass, price and policy panel. Razorpay checkout remains disabled until its three payment settings and `TICKET_SECRET` in `.env.example` are configured. `TICKET_SECRET` may be configured alone to issue free passes. Use Razorpay Test Mode first and configure its webhook endpoint as `/api/webhooks/razorpay`. Paid tickets are issued only after a captured payment is verified. Email delivery jobs are recorded in `delivery_outbox`; the mail-provider worker and payout-provider processing are later milestones. Existing memory galleries and visual assets still need a real-content review before launch.

The legal-policy copy is a business draft. Before live payments, MegMultiMedia Pvt Ltd should confirm the organiser’s public name and jurisdiction wording with its legal/accounting advisers. The published customer contact details are `info@thelucidsway.com`, `+91 9866633477`, and Door No. 101, Sri Kanakamahalakshmi Enclave, Yendada, Visakhapatnam – 530045.

## Tests

Set `TEST_DATABASE_URL` to a **separate disposable database whose name ends in `_test`**, then run `npm test`. Integration tests recreate its tables. Never use the application database for tests.

## Deployment

Deploy the repository as a **Node.js Web App** from Hostinger hPanel, rather than uploading only `dist/` through FTP. Business Web Hosting supports Express applications and Hostinger MySQL. Create the MySQL database under **Websites → Dashboard → Databases → Management**, then add the environment variables below to the Node.js deployment:

```text
NODE_ENV=production
APP_ORIGIN=https://thelucidsway.com
DATABASE_URL=mysql://HOSTINGER_DB_USER:URL_ENCODED_PASSWORD@localhost:3306/HOSTINGER_DB_NAME
PAYOUT_THRESHOLD_PAISE=200000
TICKET_SECRET=GENERATE_A_LONG_RANDOM_SECRET
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
BOOTSTRAP_ADMIN_EMAIL=lucidswayclub@gmail.com
BOOTSTRAP_ADMIN_NAME=Lucidsway Superadmin
BOOTSTRAP_ADMIN_PASSWORD=CREATE_A_STRONG_UNIQUE_PASSWORD
```

Select Node.js 22 or 24, Express/Other, and `server/index.js` as the entry file. The server applies checksum-verified migrations at startup. Hostinger supplies the application port; do not hardcode a production `PORT`. Set the Razorpay webhook to `https://thelucidsway.com/api/webhooks/razorpay`. Deploy with Razorpay Test Mode first, then replace all three Razorpay settings together for live mode.

The three `BOOTSTRAP_ADMIN_*` values create the first superadmin only when no administrator exists. After the first successful login, remove all three bootstrap variables and redeploy; the account remains in MySQL.

If the database password contains `@`, `:`, `/`, `?`, `#` or `%`, URL-encode it in `DATABASE_URL`. Keep the MySQL database and Node app assigned to the same Hostinger website. The old FTP details are not used for the full application deployment.

Use the database account created by hPanel, private secrets, Hostinger backups and a tested restore procedure. Proxy trust must be configured against the actual hosting topology before relying on per-client IP throttling. The current pool is limited to ten connections per process. No live deployment has been made.

Full scope and next milestones: [requirements](production/docs/requirements.md), [implementation plan](production/docs/implementation-plan.md).

## UI

Static assets are in `dist/`. The original standalone prototype can be served with `python3 -m http.server 5173 --directory dist`; its demo catalogue is not used by the Node home/event routes. The current design includes the logo intro, 3D photo deck, theme switch, mobile layouts and memory galleries. Supplied brand assets and placeholder photography need editorial verification before launch.
