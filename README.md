# The Dark Web Heist

A fun dark-web themed quiz — answer questions, collect keys, open the safe. Static site — no build step.

## Local preview

ES modules require HTTP (not `file://`):

```bash
cd hacker-challenge
python3 -m http.server 8080
```

Open http://localhost:8080

## GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment**
3. Source: **Deploy from a branch**
4. Branch: **main** (or **master**), folder **/ (root)**
5. Save. Site will be at `https://<username>.github.io/<repo>/`

## Customize safe combination

Edit [`js/config.js`](js/config.js):

- `symbols` — one per level (shown when each question is passed)
- `combination` — exact string to unlock the safe
- `alternateCombinations` — optional extra accepted strings

## Game rules

- 30 seconds per question
- 3 retries per question, then full restart from landing
- 7 levels → collect symbols → enter combination on safe → claim reward code
