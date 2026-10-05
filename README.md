# Gridiron Live

A college football dynasty game for iPhone, with a modern HD look (or retro pixel, your choice).

- **On the field:** drag-to-aim passing with an accuracy circle and bullet passes, plus swipe moves (juke, hurdle, dive), stiff-arms, diving tackles, two-tap kicking, weather, penalties, timeouts and college overtime rules.
- **Your program:** all 265 Division I programs (138 FBS, 127 FCS) in their 25 conferences for 2026, with FBS and FCS Top 25 polls, conference title games, the 12-team CFP, a full bowl season, the 24-team FCS playoff and the Celebration Bowl. Also rivalry trophies, the Heisman race and awards, the transfer portal, NIL money, Signing Day, redshirts, early draft declarations, coordinators, facilities, XP, injuries, morale, front-office decisions, the coaching carousel, and school records.
- **Leagues:** all of FBS and FCS (team colors, real rivalries, strength based on recent results), 32 original schools, or your own team pack. Team packs can include real rosters.
- **Saves:** 3 slots (compressed), autosave at every snap, resume a game mid-play, and save codes for backup.

## Play it right now (no install)

Open `web/index.html` in Safari or any browser. In Safari on iPhone, tap Share, then **Add to Home Screen**, and it runs full-screen like an app.

## Build the .ipa (free, from your phone or a computer)

You can't build iPhone apps on Linux or Windows, so this project uses GitHub's free macOS build machines:

1. Create a free GitHub account if you don't have one, then create a new **private** repository.
2. Upload everything in this folder to the repository, keeping the folder structure. Make sure the `.github/workflows/build-ipa.yml` file is included.
3. Open the repository's **Actions** tab. The **Build IPA** workflow runs on every push, or you can start it with **Run workflow**. It takes about 5–10 minutes.
4. When it finishes, open the run and download **GridironLive-ipa** from the Artifacts section. It's a .zip, and the `GridironLive.ipa` is inside.
5. Install it with your sideloading tool, such as Sideloadly or AltStore. They sign the app with your Apple ID during install.

Notes:
- With a free Apple ID, sideloaded apps expire after 7 days. Re-install, or let AltStore refresh it, to keep playing. Your save is kept as long as you don't delete the app.
- macOS build minutes on GitHub are limited on private repositories, but one build uses only a few.

## Making changes

Edit files in `src/` (the page is `src/index.html`; the code is in `src/js/`), then run:

```
python3 tools/build_web.py
```

That rebuilds `web/index.html`, the file the app ships. Push it, and GitHub builds a new .ipa.

See `docs/ARCHITECTURE.md` for how everything fits together.

## Controls

| Action | How |
|---|---|
| Call a play | Tap **Pass** or **Run** (on 4th down, also **Punt** or **Field goal**) |
| Throw | Drag backward from anywhere, then release. The circle shows your QB's accuracy. |
| Bullet pass | Tap a second finger while dragging, or turn on **Bullet** |
| Scramble | Quick tap before throwing |
| Steer the ball carrier | Hold your finger above or below them |
| Juke / hurdle / dive | Flick up or down / tap / flick forward |
| Kick | Tap to lock direction, tap again to lock power |
| Timeout | **Timeout** button before the snap (gets back the last play's runoff) |
| Pause / sim to final / save & exit | Pause button, top-left |

## Team packs and real rosters

In the League tab, **Export team pack** gives you the current league as text. Edit it, or write your own, and **Import team pack** to apply it. Each team can include a `roster` list such as `{"name":"First Last","pos":"QB","num":7,"yr":"JR","ovr":4}`. Positions like EDGE, OT, DT and FS are understood, and empty spots are filled with walk-ons. On the new-dynasty screen, **Load a team pack** starts a dynasty with your pack.

## Credits

Save compression uses lz-string by pieroxy (MIT License, see `tools/LZ-STRING-LICENSE.txt`). The Silkscreen font is by Jason Kottke and is licensed under the SIL Open Font License (see `tools/fonts/OFL-LICENSE.txt`).
