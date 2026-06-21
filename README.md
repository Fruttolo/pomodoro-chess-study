# Pomodoro Chess

A study session timer inspired by the chess clock: one counter at a time, no installation, no build step.

**[Try it live →](https://fruttolo.github.io/pomodoro-chess-study/)**

## How it works

Two timers — **Study** and **Break** — run in alternation. Only one ticks at a time.

Press **Start** to begin studying. Press **Switch to break** to hand control to Break. Press **Resume study** to switch back.

### Study expires → break bank grows

When Study hits zero it **does not** force you into a break. Instead:

- Study resets to its full configured duration and keeps running.
- One full Break block is **added on top** of whatever Break time is left.

Unused break time accumulates. Let Study expire twice before switching and your Break timer will have two blocks banked. You decide when to take the break — the app just tracks how much you've earned.

### Break expires → study resumes

When Break runs out, Study takes over automatically. Once both timers have been fully used, the whole session resets and Study starts again from the top.

### Phase logic reference

| Situation | What happens |
|---|---|
| Study expires, Break still has time | Study resets and restarts; one Break block added; sound plays (if enabled) |
| Break expires, Study still has time | Break is marked done; Study takes over automatically |
| Study expires after Break is already done | Both done → full session reset; Study starts again |
| Break expires after Study is already done | Both done → full session reset; Study starts again |

## Features

| Feature | Detail |
|---|---|
| Configurable durations | Minute/second steppers (0–999 min, 0–59 sec); values are also keyboard-editable |
| Settings persistence | Timer durations and sound preferences saved across page reloads |
| Sound notifications | Melodic arpeggio (C–E–G–C, Web Audio API); toggleable independently for Study and Break |
| Goal sound toggle | Optional sound when a study goal is reached |
| Visual indicator | Glowing border + breathing animation on the active block; red vignette during sound |
| Progress bar | Shows remaining time proportional to configured duration |
| Statistics | Session log per pomodoro cycle; total studied time displayed |
| Picture-in-picture | Switching tabs while a session is running floats the active timer in a mini window; closes on return |
| Reset button | Appears only during a session, with a slide-in animation |
| Accessibility | `aria-label` on all controls; `prefers-reduced-motion` respected |
| Responsive | Fluid grid layout; mobile safe-area support |

## Usage

Open `index.html` in any modern browser — or use the [live version](https://fruttolo.github.io/pomodoro-chess-study/). No dependencies, no server, no build step.

```
git clone https://github.com/fruttolo/pomodoro-chess-study.git
open index.html      # macOS
xdg-open index.html  # Linux
```

### Default durations

| Block | Duration |
|---|---|
| Study | 25:00 |
| Break | 05:00 |

## Structure

`index.html` + `style.css` + `app.js`. No npm, no framework, no config files. The only external resource is [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) loaded from Google Fonts.

## Compatibility

Requires a browser with **Web Audio API** and **Picture-in-Picture API** support (all modern desktop browsers). Sound is initialized on the first user click to comply with browser autoplay policies.
