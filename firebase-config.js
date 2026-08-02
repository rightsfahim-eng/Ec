/* ==========================================================================
   FIREBASE CONFIG
   ----------------------------------------------------------------------
   This file connects your site to a free Firebase project so the
   Notice, Buy/Sell links, Reviews, and Complaint Reports update live
   for EVERY visitor — not just in your own browser.

   HOW TO SET THIS UP (5 minutes, free):
   1. Go to https://console.firebase.google.com → "Add project" → name it
      anything (e.g. "exotic-club") → finish the wizard.
   2. In the project, click "Build" → "Firestore Database" → "Create
      database" → start in PRODUCTION mode → pick any region.
   3. Go to "Project settings" (gear icon) → scroll to "Your apps" →
      click the </> (Web) icon → register the app (any nickname, no
      need for Firebase Hosting) → copy the firebaseConfig object it
      shows you → paste the values below, replacing the placeholders.
   4. In Firestore → "Rules" tab, paste the rules from README.md and
      click "Publish". This lets visitors submit reports/read content,
      but only the admin page (with your password) can manage things.
   5. Push this repo to GitHub → done. Every visitor now sees the same
      live Notice, Buy/Sell links, and Reviews, and every complaint
      lands in your Admin page.

   If you skip this step entirely, the site still works — but it runs
   in LOCAL MODE: content is stored only in your own browser
   (localStorage) and nobody else will see admin changes or be able to
   send you reports. Fine for testing, not for real use.
   ========================================================================== */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCUW9Xtv9jmczletCt_LmQNtrc99dEQ6RY",
  authDomain: "exotic-club-x1.firebaseapp.com",
  projectId: "exotic-club-x1",
  storageBucket: "exotic-club-x1.firebasestorage.app",
  messagingSenderId: "360023962237",
  appId: "1:360023962237:web:d9fb9f0608dff817b4b714"
};

/* ==========================================================================
   ADMIN LOGIN
   ----------------------------------------------------------------------
   Once Firebase is configured (above), the admin page signs in with a
   REAL Firebase account. This matters: it's what lets your Firestore
   security rules actually block strangers from reading complaint
   reports — a password box alone can't do that on a static site,
   since anyone can view your site's JavaScript.

   To create your admin account:
   1. In the Firebase console → "Build" → "Authentication" → "Get
      started" → enable the "Email/Password" sign-in method.
   2. Still in Authentication → "Users" tab → "Add user" → enter an
      email (can be anything, e.g. admin@exoticclub.local) and a
      strong password.
   3. Put that same email below as ADMIN_EMAIL. You'll type the
      password (not the email) into the admin.html lock screen.

   LOCAL MODE fallback (only used if Firebase isn't configured yet):
   the admin page instead checks a SHA-256 hash of a simple password,
   with no real backend behind it — fine for testing on your own
   device, not for real use. Default local password: exotic123
   To change it: open admin.html, open the browser console (F12), run
     crypto.subtle.digest("SHA-256", new TextEncoder().encode("yourPassword"))
       .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")))
   and paste the result into ADMIN_PASSWORD_HASH below.
   ========================================================================== */

window.ADMIN_EMAIL = "rights.fahim@gmail.com"; // your Firebase Auth admin login

window.ADMIN_PASSWORD_HASH =
  "1a46c5d82c8d313a73ba9d8a5d532e350ff15fca8e56cbac9da3c1f88e1f9c0e"; // LOCAL MODE ONLY — hash of "exotic123"
