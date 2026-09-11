# Fion — Portfolio

Plain HTML / CSS / JS. No build step, no npm required — this was the right call for
a portfolio going to GitHub Pages, since GitHub Pages can serve these files directly.

## File structure

```
index.html              home page
about.html               about page
projects/
  66-days.html            case study
  pip.html                 case study (EV charging)
css/style.css             design tokens + all styles
js/
  partials.js              shared header/footer + mobile nav (edit once, updates everywhere)
  projects-data.js         project list that renders the homepage cards
  about-data.js            work experience + education lists on the about page
assets/images/             cropped images pulled from your Figma screenshots
```

## Editing content

- **Add/remove/reorder a project** → edit the `PROJECTS` array in `js/projects-data.js`. The homepage card list re-renders automatically.
- **Add/edit a job or education entry** → edit `EXPERIENCE` / `EDUCATION` in `js/about-data.js`.
- **Change nav or footer/contact info** → edit `js/partials.js` once; every page picks it up.
- **Swap an image** → drop a new file into `assets/images/` and update the path.
- **Resume download**: add your actual PDF as `assets/Fion-Resume.pdf` (the button on the about page already points there).
- Several sections still use dashed placeholder boxes (sketches, moodboards, process shots) — export those from Figma and swap them in the same way as other images.

## Run it locally

No install needed. Just open `index.html` in a browser, or for the mobile-nav/scroll behaviour to feel accurate, serve it locally:

```
cd portfolio
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `fion-portfolio`).
2. Push these files to the repo root:
   ```
   cd portfolio
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, branch `main`, folder `/ (root)`. Save.
4. Your site goes live at `https://<your-username>.github.io/<repo-name>/` within a minute or two.
5. (Optional) Custom domain: add a `CNAME` file with your domain in the repo root, and point your domain's DNS at GitHub Pages per their docs.

## Responsive breakpoints

- Desktop: > 1024px — full layout as designed
- Tablet: 720–1024px — hero stacks, project cards stay side-by-side, grids condense
- Mobile: < 720px — nav becomes a hamburger menu, project cards and photo grids stack fully
