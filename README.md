# EXOTIC CLUB

Glassmorphic, neon-lit landing page + live-editable admin panel for a TikTok/Instagram
account trading community. Pure HTML/CSS/JS — deploys straight to GitHub Pages, no
build step, no framework.

```
exotic-club/
├── index.html          → main page
├── guid.html            → "Secret Guideline" page
├── admin.html           → password/login-protected admin dashboard
├── css/style.css        → the entire design system
└── js/
    ├── firebase-config.js  → your Firebase keys + admin login (edit this)
    ├── db.js                → data layer (Firebase or local fallback)
    ├── main.js               → index.html interactivity
    └── admin.js               → admin.html interactivity
```

## What's on the site

**Main page** — notice pill, glowing "EXOTIC CLUB" wordmark with a neon flicker-on
animation, three pill buttons (Secret Guideline / Buy·Sell / Complaint Box), a
right-to-left auto-scrolling reviews strip, and a floating glass complaint form with
an anonymous-report mode.

**Buy/Sell button** expands into two buttons that appear directly over it (rest of the
stack blurs out), each showing a "redirecting" toast before opening your link in a new
tab.

**Complaint box** collects Name / Date / Type (Photo, Video, Person, Others) / a
scrollable details field, with a "report anonymously" toggle that hides Name and Type
and marks the submission anonymous.

**Admin page** (`admin.html`) — password-gated, three tabs: **Person Report**,
**Anonymous Report** (both live-list every submitted complaint with a delete button),
and **Settings** (edit the notice text, Buy/Sell links, and add/remove client reviews —
all update the live site instantly for every visitor).

## Making it live for everyone (Firebase — free)

GitHub Pages only serves static files, so out of the box every browser has its own
separate copy of the data (**LOCAL MODE** — fine for testing, but your admin edits and
visitor complaints won't be shared). To make everything live and shared, connect a free
Firebase project:

1. **Create the project** → [console.firebase.google.com](https://console.firebase.google.com)
   → "Add project" → any name → finish the wizard.
2. **Firestore** → "Build" → "Firestore Database" → "Create database" → start in
   *production* mode → any region.
3. **Authentication** (this is what actually protects your reports from strangers) →
   "Build" → "Authentication" → "Get started" → enable **Email/Password** sign-in →
   "Users" tab → "Add user" → set an email + a strong password. This is your admin login.
4. **Register a web app** → Project settings (gear icon) → "Your apps" → the `</>` icon
   → give it any nickname → copy the `firebaseConfig` object it shows you.
5. Open `js/firebase-config.js` and:
   - Paste your `firebaseConfig` values into `window.FIREBASE_CONFIG`.
   - Set `window.ADMIN_EMAIL` to the email you created in step 3.
6. In Firestore → **Rules** tab, replace the default rules with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /config/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /reviews/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /reports/{doc} {
         allow create: if true;
         allow read, update, delete: if request.auth != null;
       }
       match /stock/{doc} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

   This lets anyone read the notice/links/reviews and submit a complaint, but only
   someone signed in as your admin account can read or delete complaints, or edit
   settings/reviews. Click **Publish**.

7. Commit and push — done. `admin.html` now asks for your real Firebase password and
   everything syncs live across every visitor's browser.

If you skip all of this, the site still runs fully in LOCAL MODE for demoing —
`admin.html` falls back to a simple local password (default `exotic123`, change it
via the instructions inside `js/firebase-config.js`) but nothing you edit there is
visible to anyone but you, on that one device.

## Deploying to GitHub Pages

1. Create a new GitHub repo and push this whole folder to it (`index.html` must sit at
   the repo root, or in `/docs` if you configure Pages that way).
2. Repo → **Settings** → **Pages** → Source: "Deploy from a branch" → pick `main` and
   `/root` (or `/docs`) → Save.
3. Your site goes live at `https://<your-username>.github.io/<repo-name>/` within a
   minute or two.
4. Visit `/admin.html` on that same domain to manage the site.

## Customizing

- **Colors / fonts / spacing** — everything is driven by CSS variables at the top of
  `css/style.css` (`--pink`, `--red`, `--yellow`, `--bg-0/1/2`, `--font-display`,
  `--font-body`, `--font-bn`).
- **Default notice / links / reviews** shown before Firebase loads (or in Local Mode)
  live in `js/db.js` under `DEFAULT_CONFIG` and `DEFAULT_REVIEWS`.
- **Guideline content** is plain HTML in `guid.html` — edit the numbered items freely.
