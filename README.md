# Anchor

A guided pelvic floor (Kegel) trainer for men. Ten levels that progress from lying down to standing, a visual hold timer with audio and vibration cues, and progress tracking to keep a daily habit going.

## Use it

Live at https://joshcarr.github.io/anchor/ (deployed by `.github/workflows/pages.yml` on every push to `main`).

To run locally, open `index.html` in a browser or serve the folder:

```sh
python3 -m http.server 8000
```

On a phone, open the hosted page and use "Add to Home Screen". It installs as an app and works offline. Progress is stored in the browser's local storage on that device.

## The program

Each session opens with belly breathing and ends with reverse Kegels (relaxation), with strength work in between:

| Level | Name | Position | Main work |
|---|---|---|---|
| 1 | Foundation | Lying | 8 × 3s holds, 8 flicks |
| 2 | Groundwork | Lying | 10 × 4s holds, 10 flicks |
| 3 | Steady | Lying | 10 × 5s holds, 12 flicks |
| 4 | Upright | Sitting | 10 × 5s holds, 12 flicks, elevator |
| 5 | Control | Sitting | 10 × 6s holds, 15 flicks, elevator |
| 6 | Endurance | Sitting | 10 × 7s holds, 15 flicks, pyramid to 8s |
| 7 | Standing | Standing | 10 × 7s holds, 15 flicks, pulse holds |
| 8 | Strength | Standing | 10 × 8s holds, 20 flicks, 4-floor elevator, pulse holds |
| 9 | Power | Standing | 10 × 10s holds, 20 flicks, pyramid to 10s, pulse holds |
| 10 | Mastery | Standing | 12 × 10s holds, 20 flicks, elevator, pulse holds, the Knack |

After each session you rate it Easy, Just right or Too hard. The app suggests moving up after 5 sessions at a level with none of the last three rated too hard (or after 3 straight "easy" ratings), and suggests stepping back after two "too hard" ratings in a row. You can also change level manually in Settings.

The structure follows common guidance from the NHS, Mayo Clinic and Cleveland Clinic: train daily, mix slow holds with quick contractions, build toward 10-second holds, rest at least as long as you hold, and progress from lying to sitting to standing. This isn't medical advice; see the Learn tab for when to check with a doctor.

## Files

- `index.html` – page shell
- `styles.css` – styles, light and dark themes
- `app.js` – program, session player, tracking
- `sw.js`, `manifest.webmanifest`, `icon.svg`, `*.png` – installable, offline-capable web app
