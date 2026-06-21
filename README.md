# Study ⇄ Break — Chess Clock Timer

A study session timer inspired by the chess clock: one counter at a time, no installation, a single HTML file.

## How the timer works

The timer operates like a chess clock — only one block counts down at a time. When you start a session, the **Study** timer begins. Pressing the main button hands control over to the **Break** timer, and pressing again hands it back.

### The key rule: study end does not force a break

When the Study timer reaches zero, **the app does not automatically switch you to Break**. Instead:

- Study resets to its full configured duration and keeps running.
- One full Break block is **added on top of whatever Break time is left**.

This means unused break time accumulates. If you let Study expire twice before taking a break, your Break timer will have two break blocks banked on top of each other. You decide when to actually take the break — the timer just keeps track of how much you have earned.

### Full phase logic

| Situation | What happens |
|---|---|
| Study expires, Break still has time | Study resets and restarts; one Break block added to Break's remaining time; sound plays (if enabled) |
| Break expires, Study still has time | Break is marked done; Study takes over automatically |
| Study expires after Break is already done | Both are done → full session reset; Study starts again from the top |
| Break expires after Study is already done | Both are done → full session reset; Study starts again from the top |

## Features

| Feature | Detail |
|---|---|
| Configurable durations | Minute/second steppers (0–999 min, 0–59 sec); values are also keyboard-editable |
| Sound notifications | Melodic arpeggio (C–E–G–C, Web Audio API); can be toggled independently for Study and Break |
| Visual indicator | Glowing border + breathing animation on the active block; red vignette during sound |
| Progress bar | Shows remaining time proportional to the configured duration |
| Reset button | Appears only during a session, with a slide-in animation |
| Accessibility | `aria-label` on all controls; `prefers-reduced-motion` respected |
| Responsive | Fluid grid layout; mobile safe-area support |

## Usage

Open `pomodoro-scacchi.html` in any modern browser. No dependencies, no server, no build step.

```
git clone <repo-url>
open pomodoro-scacchi.html      # macOS
xdg-open pomodoro-scacchi.html  # Linux
```

### Default durations

| Block | Duration |
|---|---|
| Study | 25:00 |
| Break | 05:00 |

## Structure

The project is a single file `pomodoro-scacchi.html` containing HTML, CSS, and JavaScript inline. No npm dependencies, no framework, no config files. The only external resource is the [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) font loaded from Google Fonts.

## Compatibility

Requires a browser with **Web Audio API** support (all modern desktop/mobile browsers). Sound is initialized on the first user click to comply with browser autoplay policies.
