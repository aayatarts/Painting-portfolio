# Artist Portfolio Website

A minimalist, gallery-style portfolio site built with plain HTML, CSS and vanilla
JavaScript — no frameworks, no build tools, no dependencies. Just static files
you can host anywhere for free.

**All everyday content — paintings and artist/contact details — lives in two
simple files in the `data/` folder, so you can update the site without ever
opening the HTML, CSS or JS files.**

## File structure

```
/
├── index.html               Home page (hero + featured works)
├── gallery.html              Full gallery with category filters + lightbox
├── discounts.html             Paintings currently on sale
├── about.html                 Artist bio / statement / exhibitions
├── contact.html                Contact info + Formspree contact form
├── data/
│   ├── paintings.csv         ★ Edit this to add/update/remove paintings, or put one on sale
│   └── artist.json           ★ Edit this to update the artist's bio & contact info
├── css/style.css            All styling (colors/fonts are CSS variables at the top)
├── js/script.js             Loads data/ files and renders the site (no editing needed)
├── images/paintings/         Painting images
├── images/artist-photo.svg   Artist photo (placeholder — replace with a real photo)
├── preview.ps1               Local preview server (used by Start Preview.bat)
└── Start Preview.bat          ★ Double-click this to preview your changes
```

---

## 1. Updating content (no coding needed)

### Adding, editing or removing a painting → `data/paintings.csv`

This is a spreadsheet-style file. Open it by double-clicking — it should open in
Excel or Google Sheets. Each row is one painting. Columns:

| Column | What to put | Example |
|---|---|---|
| Title | The painting's name | `Golden Valley at Dusk` |
| Category | `Landscape`, `Botanical`, `Still Life`, `Religious`, `Abstract`, or `Statement` | `Landscape` |
| Medium | What it's painted with | `Oil on canvas` |
| Dimensions | Size | `30 x 40 in` |
| Year | Year painted | `2023` |
| Status | `Available`, `Inquire`, or `Sold` | `Available` |
| Image | The image file name (see below) | `landscape-01.svg` |
| Alt Text | A short description, for accessibility & search engines | `Golden valley at sunset with rolling hills` |
| Featured | `TRUE` to also show it on the Home page, otherwise `FALSE` | `TRUE` |
| Additional Images | Extra photos of the *same* painting (different angles, close-ups, in a frame, etc.) | `angle-2.jpg\|close-up.jpg` |
| Discount | `TRUE` to put the painting on sale (shows a badge and adds it to the Discounts page), otherwise `FALSE` | `TRUE` |
| Discount % | The percentage off, just the number, no `%` sign. Leave blank if Discount is `FALSE` | `20` |

**To add a new painting:** put the image file in the `images/paintings/` folder,
then add a new row to the CSV with its details and the exact file name in the
`Image` column. That's it — it will automatically appear in the gallery (and on
the home page if `Featured` is `TRUE`). Every row in the file shows up on the
site — there's no separate on/off switch, so only add a row once you're ready
for people to see it.

**To mark a piece as sold:** just change its `Status` cell to `Sold` and save.
The painting still shows in the gallery, just with a "Sold" badge instead of
"Available" — that's the intended way to keep sold work visible for people to
browse without implying it can still be bought.

**To show more photos of one painting (e.g. a close-up or a different angle):**
put the extra image file(s) in `images/paintings/` like normal, then list their
file names in the `Additional Images` cell for that row, separated by a pipe
character `|` — for example: `golden-valley-close-up.jpg|golden-valley-framed.jpg`.
When someone opens that painting in the gallery lightbox, small thumbnails
appear underneath the main photo so they can click through the extra angles.
Leave this cell blank if a painting only has one photo — nothing extra will
show up. This is separate from the main `Image` column, which is still the
photo shown first and in the gallery grid.

**To put a painting on sale:** set its `Discount` cell to `TRUE` and its
`Discount %` cell to the percentage off (just the number, e.g. `20`). It will
automatically get a "% Off" badge on its card and appear on the new
**Discounts** page (linked in the nav bar). No price is shown anywhere — just
the percentage.

**To end a sale:** set `Discount` back to `FALSE` (and optionally clear
`Discount %`) — it disappears from the Discounts page and loses its badge
everywhere else.

**Tips:**
- Don't change the column headers in row 1.
- If a cell needs a comma (e.g. in Alt Text), wrap it in double quotes: `"Fox, resting in tall grass"`.
- Save the file in **CSV format** (not `.xlsx`) if your spreadsheet program asks.
- Blank rows are ignored.

### Updating the artist's bio & contact details → `data/artist.json`

Open this file in Notepad (or any text editor — right-click → Open with → Notepad).
It's a set of `"label": "value"` lines. Edit the text between the quotes and save.

| Field | Controls |
|---|---|
| `name` | Artist name, shown in the nav bar, hero, and footer |
| `tagline` | One-line tagline under the artist name on the home page |
| `intro` | The short introduction paragraph on the home page |
| `heroImage` | Path to the big hero image on the home page |
| `artistPhoto` | Path to the photo on the About page |
| `bio` | A list of paragraphs for the About page — add or remove lines as needed |
| `achievements` | A list of exhibitions/awards, each with a `title` and `detail` |
| `email` | Contact email address |
| `whatsapp` | WhatsApp number, digits only, no `+`, spaces or dashes (country code + number, e.g. `14155552671`) |
| `instagram` | Instagram handle, without the `@` |
| `formspreeEndpoint` | Your contact form's Formspree URL (see below) |

**Important when editing this file:** every line except the last one in a group
needs a comma at the end, and text must stay inside double quotes `" "`. The
easiest way to avoid mistakes is to only change the text between existing
quotes, without adding or deleting any quotes, commas, or brackets. If the
website stops showing your bio/contact info after an edit, the most common
cause is a missing comma or quote — compare against the original structure.

### Setting up the contact form (Formspree)

1. Go to [formspree.io](https://formspree.io) and create a free account.
2. Create a new form and copy the endpoint it gives you (looks like
   `https://formspree.io/f/xxxxxxxx`).
3. Open `data/artist.json` and replace the `formspreeEndpoint` value with it.
4. Submit a test message from the live site once — Formspree requires one
   confirmation click the first time to activate the form.

---

## 2. Previewing your changes

Because browsers block a double-clicked HTML file from reading local data
files (a security rule for the `file://` protocol), opening `index.html`
directly will show a "paintings could not be loaded" message. This does
**not** happen once the site is hosted online — it only affects local preview.

**To preview locally: double-click `Start Preview.bat`.** It opens the site in
your browser at `http://localhost:8000` with your data changes loaded
correctly. It uses only built-in Windows tools, so nothing needs to be
installed. Close the black window when you're done previewing.

(If you're on Mac/Linux instead, run `python3 -m http.server 8000` or
`npx serve .` from this folder, then visit `http://localhost:8000`.)

---

## 3. Deploy for free on GitHub Pages

1. Create a new GitHub repository and push this project to it:
   ```
   git init
   git add .
   git commit -m "Initial portfolio site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub, open the repository → **Settings** → **Pages**.
3. Under "Build and deployment", set **Source** to `Deploy from a branch`.
4. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
5. After a minute, your site will be live at:
   `https://<your-username>.github.io/<your-repo>/`
6. Go back to `index.html`, `gallery.html`, `about.html`, `contact.html` and
   update the `og:url` meta tags to that real URL so social link previews work.

Whenever you edit `data/paintings.csv` or `data/artist.json` afterwards, just
commit and push again (`git add . && git commit -m "Update paintings" && git push`)
and the live site updates within a minute or two — no rebuild step required.

### Alternative: Netlify or Vercel (also free)

- **Netlify**: drag-and-drop the whole project folder onto
  [app.netlify.com/drop](https://app.netlify.com/drop), or connect the GitHub
  repo for auto-deploys on every push.
- **Vercel**: import the GitHub repo at [vercel.com/new](https://vercel.com/new)
  and deploy with the default static-site settings (no build command needed).

---

## 4. Other things you may want to customize

These are less frequently changed, so they live directly in the page files
rather than the data files. Look for `<!-- REPLACE: ... -->` comments:

| What | Where |
|---|---|
| Page titles / meta descriptions / Open Graph tags | `<head>` of every `.html` page |
| Accent color / fonts | CSS variables at the top of `css/style.css` |
| Category filter buttons (if you add a category beyond Landscape/Wildlife/Botanical) | `gallery.html` — add a matching `<button class="filter-btn" data-filter="...">` |

## Notes

- Painting images currently include a few placeholder SVGs so the site works
  out of the box. Replace them with real photos (JPG/WebP recommended,
  ~1600px on the longest side is plenty for the lightbox), drop them in
  `images/paintings/`, and reference the file name in `data/paintings.csv`.
- Images use `loading="lazy"` for performance — no extra library needed.
- The lightbox supports Esc to close, Left/Right arrow keys, and swipe
  gestures on touch devices.
- If `data/artist.json` fails to load (e.g. a typo breaks its formatting), the
  site quietly falls back to the placeholder text baked into the HTML rather
  than breaking — check your browser's console (F12) for a warning message
  pointing to the problem.
