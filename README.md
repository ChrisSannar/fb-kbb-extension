# FB Marketplace → KBB & CarComplaints

A small browser extension. When you're looking at a car on **Facebook Marketplace**, click its
toolbar button to jump straight to that car's **Kelley Blue Book** value and its
**CarComplaints.com** reliability page — each in one click.

> Personal use only — this isn't in any web store. You add it to your own browser using the steps
> below. No programming knowledge needed.

---

## What you need

- A computer: **Mac, Windows, or Linux**.
- **Google Chrome**, **Microsoft Edge**, or **Brave** (any "Chromium" browser). *Firefox and Safari
  won't work.*
- About 5 minutes.

---

## Step 1 — Get the project onto your computer

Pick one:

- **Download (easiest):** On the project's GitHub page, click the green **`< > Code`** button →
  **Download ZIP**. Find the downloaded file and unzip it (double-click it). You'll get a folder
  called **`fb-kbb-extension`**.
- **Or with Git:** `git clone git@github.com:ChrisSannar/fb-kbb-extension.git`

---

## Step 2 — Build it (one click)

The extension comes **pre-built**, so most people can skip straight to **Step 3**. Only do this step
if Step 3 says files are missing, or if you've changed the code.

Open the `fb-kbb-extension` folder and run the setup file for your system:

| Your computer | What to do |
| --- | --- |
| **Windows** | Double-click **`setup.bat`** |
| **Mac** | Double-click **`setup.command`**. If macOS blocks it, **right-click → Open** the first time. |
| **Linux** | Open a terminal in the folder and run **`./setup.sh`** |

It installs a small build tool called **Bun** (only if you don't already have it), builds the
extension, and prints the folder you'll need in Step 3. That's it — no commands to memorize.

---

## Step 3 — Add it to your browser

1. Open your browser's extensions page by typing one of these in the address bar:
   - Chrome → `chrome://extensions`
   - Edge → `edge://extensions`
   - Brave → `brave://extensions`
2. Turn on **Developer mode** (a switch, usually top-right).
3. Click **Load unpacked**.
4. Choose the **`extension`** folder *inside* `fb-kbb-extension` (the inner one — the one Step 2
   printed). 
5. **Pin it:** click the puzzle-piece icon in the toolbar and pin **"FB Marketplace → KBB"** so its
   button is always visible.

---

## Step 4 — Use it

1. Log in to Facebook and open a **car listing** — the address bar will contain
   `/marketplace/item/`.
2. Click the extension's button. A popup shows the car's **Make / Model / Year** (and trim),
   already filled in for you.
3. Click **Check on KBB** or **View on CarComplaints** — the matching page opens in a new tab.

Something filled in wrong? Just edit the boxes in the popup; the links update as you type.

---

## If something's not working

- **The button is greyed out.** You're not on a Facebook Marketplace page — it only lights up there.
- **It says it can't read the car.** Type the Make / Model / Year into the popup boxes yourself; the
  links still work.
- **You changed something and nothing updated.** On the extensions page, click the **reload (↻)**
  icon on the extension's card, then refresh the Facebook tab.
- **A link opens the wrong page.** Edit the boxes in the popup to match the car, then click again.

---

## For developers

Build internals, the optional KBB trim scraper, architecture, and tests are in
**[DEVELOPER.md](DEVELOPER.md)**.
