# RCA: Free Coins can be claimed more than 5 times a day

## Root cause
`watchFreeCoins()` in `js/app.js` (about line 441) checks the daily limit when the button is pressed. It only updates the counter after the 3-second ad finishes, inside the `showAd` callback:

```js
function watchFreeCoins() {
  if (!freeCoinsLeft()) return toast('Come back tomorrow...');   // check at click time
  showAd(() => {                                                  // reward fires ~3 s later
    ...
    state.freeCoins.count += 1;                                   // counter changes only here
    grant({ coins: 100 });
```

Nothing records that an ad is already running, and the limit is not checked again when the reward is granted. If the action fires again during the 3-second ad window, `freeCoinsLeft()` still returns the old value. Each call starts its own `showAd` timer, and each timer grants 100 coins and adds 1 to the count. With 4 already used, a second activation during the ad gives 6 grants. `Math.max(0, ...)` then hides the overshoot, so the UI shows "0 left".

## Evidence
I ran the game in Edge on a fresh save, opened the Store and called the Watch button's click 3 times back to back. All 3 started an ad and all 3 rewarded. The saved `freeCoins.count` was 3 and the Store showed "2 left today", although only one ad's worth of time had passed. The same path gives a 6th reward when 4 are already used.

## How a player hits it
The ad overlay (`#ad-overlay`, absolute, z-index 60) blocks mouse clicks but not keyboard activation. Enter or Space on the still-focused Watch button, a double-tap or key repeat, or a touch event that gets through can all re-trigger it. That fits "seen once": it needs a second activation inside the 3-second window.

## Suggested fix
- Add an "ad in progress" flag in `watchFreeCoins` and ignore calls while it is set. Clear it when the ad ends.
- Re-check `freeCoinsLeft()` inside the reward callback, before granting.
