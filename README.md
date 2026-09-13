# The Lucid Sway — UI prototype

Responsive, macOS-inspired event discovery and booking UI. Static HTML, CSS and JavaScript; no build dependencies. Serve `dist` with any static HTTP server (e.g. `python3 -m http.server 5173 --directory dist`).

Includes a floating magnifying dock, translucent desktop chrome, pointer-driven perspective, layered photography, animated posters, city filters, shareable event hash routes, pass selection, demo promo calculation, form validation, confirmation preview and a gallery modal. Respects reduced motion and offers a pause control.

## Scope

This is UI only. All events, venues, prices, dates and poster branding are illustrative. External Unsplash photos (Nathan Collier and Asher Hansow) are moodboard placeholders, not photographs of Lucid Sway events. Google Fonts and Unsplash need an internet connection; fonts have local fallbacks. Replace these with supplied, cleared brand assets before launch.

Motion references: https://jitter.video/ , https://magicui.design/ , https://threlte.xyz/ . Effects are implemented with CSS and browser APIs, not imported Jitter exports or Magic UI/Threlte components. Magic UI targets React; Threlte targets Svelte. Avoid mixing frameworks solely for effects.

## Next implementation phase

Choose the production stack after reviewing this UI. The supplied brief mentions WordPress/Hostinger; the current static prototype does not commit to a different CMS or hosting provider. Port design tokens and templates into that stack if retained.

Production needs server-authoritative events/pass availability, coupon validation, payment orders and verified idempotent payment webhooks. Only paid, verified registrations should create tickets. QR codes must use opaque identifiers with atomic single-use redemption on the backend. Add role-based permissions scoped to event IDs for organisers; volunteers may access only their own referral metrics. Enforce permissions on the server, never just in UI.

No payment, authentication, messaging, ticket generation, admin system or real registration storage is implemented. The document's full-development and approval instructions are project context; this pass follows the user's request to build UI first.

## Gallery update

The enhanced transparent logo is served from `dist/assets/lucids-way-logo.png` across the header, footer, dock, favicon, event pages, memory pages and intro animation. Dedicated static archive pages are available at `/memories/after-hours/`, `/memories/in-the-moment/`, and `/memories/one-more-song/`. Gallery data and interactions are in `dist/memories.js`; visual styling is in `dist/gallery.css`. Collections remain illustrative and include Unsplash moodboard photographs by Nathan Collier, Asher Hansow and Ahmed Samy; replace with the client event assets. Lightbox supports Escape, left/right arrows and focus restoration. Button and gallery motion respect the system reduced-motion preference and the dock toggle.

## Hero motion and theme

`experience.css` and `experience.js` add CSS 3D rotating orbital rings, floating layers, pointer parallax, and an animated headline. `theme.js` applies a saved light/dark preference before rendering, falling back to the OS preference. Dark mode uses logo-inspired burgundy and charcoal across home, booking dialogs and memory pages. The header theme switch persists across pages. Motion respects reduced-motion and the dock pause control; headline cycling and hero animations pause when offscreen or hidden.
