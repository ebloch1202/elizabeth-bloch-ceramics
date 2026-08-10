# Elizabeth Bloch Ceramics — site

A simple 4-page website: Home, Gallery, About, Contact. No frameworks —
just HTML, CSS, and a little JavaScript, so every file is easy to read
and edit.

## File structure

```
ceramic-site/
├── index.html            Home page
├── gallery.html           Full gallery
├── about.html             About / bio
├── contact.html            Contact form
├── css/style.css          All styling (colors, fonts, layout)
├── js/script.js            Mobile menu + scroll animations
├── images/                 Photos used across the site
├── favicon.svg              Browser-tab icon (bottle mark)
├── favicon.ico                Fallback icon for older browsers
├── apple-touch-icon.png        Icon used when saved to an iOS home screen
├── robots.txt                   Tells search engines what they can crawl
└── sitemap.xml                   Lists pages for search engines to index
```

## Open it in VS Code

1. Open VS Code → File → Open Folder → select the `ceramic-site` folder.
2. Install the **Live Server** extension (Extensions icon in the left
   sidebar → search "Live Server" by Ritwick Dey → Install).
3. Right-click `index.html` in the file list → **Open with Live Server**.
   Your site opens in the browser and auto-refreshes every time you save.

## Adding or swapping photos

Photos live in `images/`. To add a new gallery piece, in `gallery.html`
copy one whole `<a class="piece ...">...</a>` block and paste it below
the last one, then point its `src` at the new file and update the `alt`
text, title, and caption. (Note: the grid currently renders every piece
at the same square size, so the `piece--wide` / `piece--tall` /
`piece--small` classes on each `<a>` aren't visually doing anything
right now — that's fine to leave as-is, or remove them if you'd rather
the markup match what's actually happening.)

## Clicking a piece opens a detail view

Clicking any piece expands an inline panel right in the grid — large
photo on one side, details sliding in on the other — instead of
navigating to a new page. This is driven by `data-*` attributes on the
`<a class="piece">` tag, not by separate markup, so adding a new piece
means setting these:

```html
<a class="piece piece--small" href="#"
   data-title="Ash-Glazed Vessel"
   data-medium="Stoneware · 2026"
   data-dimensions="Height: 12in · Width: 8in"
   data-description="A short line about the piece, its glaze, or its firing.">
  <img class="photo" src="images/your-file.jpg" alt="description" />
  <div class="piece-label"><p class="title">Ash-Glazed Vessel</p><p class="meta">Stoneware · 2026</p></div>
</a>
```

`data-title` and `data-medium` are already set on every piece (they
mirror the visible caption). `data-dimensions` and `data-description`
are optional — the detail panel only shows a line if you've added one,
so it's fine to leave them off for now and fill them in piece by piece
whenever you have the measurements handy.

**Photo tips for ceramics:**
- Even, diffused light (an overcast window or a simple lightbox) reads
  much better than a flash — flash flattens glaze texture and creates
  hot spots on shiny glazes.
- A plain, consistent background keeps the gallery grid feeling unified.
- Shoot at the highest resolution your camera/phone allows, then
  compress down for the web — you can't add back detail later.

## The contact form

The form on `contact.html` is already wired up to
[Formspree](https://formspree.io) — submissions land in your inbox, no
backend code required. If you ever need to move it to a different
Formspree account or form, swap the `action` URL on the `<form>` tag.

## Before you launch: a few things still need real content

- **Replace the placeholder domain** — the SEO tags below (canonical
  links, Open Graph/Twitter previews, `sitemap.xml`, `robots.txt`) all
  use `https://YOUR-DOMAIN-HERE.com` as a stand-in. Once you know the
  real domain the site will live at, find-and-replace
  `YOUR-DOMAIN-HERE.com` across every `.html` file plus `robots.txt`
  and `sitemap.xml`.
- **Favicon is a placeholder** — `favicon.svg` is a simple bottle mark
  so the browser tab isn't blank. Swap it for a real logo/mark whenever
  you have one; regenerate `favicon.ico` and `apple-touch-icon.png` to
  match (any online favicon generator works, or ask for help doing it
  here).

## SEO basics already in place

Every page has a `<title>`, meta description, canonical link, and
Open Graph/Twitter preview tags (what shows up when a link is shared on
social media or messaging apps) — currently pointing at the placeholder
domain above. `robots.txt` and `sitemap.xml` at the site root tell
search engines the site is crawlable and list the four pages. Once the
site is live at a real domain, submitting `sitemap.xml` to
[Google Search Console](https://search.google.com/search-console) helps
it get indexed faster.

## Publishing the site

Two free, beginner-friendly options:

- **Netlify Drop** (https://app.netlify.com/drop) — literally drag this
  folder into the browser window and it's live in seconds. No account
  needed to start. Easiest option for a first launch.
- **GitHub Pages** — push this folder to a GitHub repository, then turn
  on Pages in the repo settings. More setup, but free and gives you
  real version control.

Either way, once you've bought your domain from Porkbun, you point its
DNS at whichever host you chose — both Netlify and GitHub Pages show
you the exact records to add in Porkbun's DNS settings when you connect
a custom domain there.
