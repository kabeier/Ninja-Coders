# It's Codin' Time Console Game

A cleaned-up rebuild of the original browser console OOP teaching game.

## Asset setup

This project intentionally reuses the original asset paths. Put these folders/files beside `index.html`:

```text
images/
audio/
fonts/
favicon.ico
```

## Run

Use a local static server from this folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Open DevTools Console and type:

```js
tutorial()
```

## Teaching commands

```js
 yoshi = new Hero()
yoshi.hue = 250
 danny = new Footman()
yoshi.walkRight()
yoshi.walkLeft(3)
yoshi.blockRight()
yoshi.attack(danny)
```

## Why this version should line up

The layout keeps the original fixed 1000px × 1000px backdrop coordinate system. Token positions, projectile tops, health bar position, and bomb prompt position are all based on the original CSS/JS coordinate assumptions.
