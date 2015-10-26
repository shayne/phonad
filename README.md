# phonad
A WIP of implementing a Xmonad inspired config for kasper/phoenix

## Features

### Key Handlers

**`mod1`** = `alt + shift`

**`mod2`** = `alt + shift - ctrl`

**`'r' + mod2`**
* Reload Phoenix config

**`'1' + mod2`**
* Re-layout

**`'i' + mod1`**
* Focus/Launch iTerm

**`'a' + mod1`**
* Focus/Launch Atom

**`'c' + mod1`**
* Focus/Launch Google Chrome

**`'return' + mod1`**
* Make focused window primary window in current screen's layout

**`'t' + mod1`**
* Toggle ignoring of focused window in layout

**`'r' + mod1`**
* Reset width of current focused window

**`'h' + mod1`**
* Decrease the width of current focused window

**`'l' + mod1`**
* Increase the width of current focused window

**`'j' + mod1`**
* Cycle current screen window focus to the right

**`'k' + mod1`**
* Cycle current screen window focus to the left

**`'j' + mod2`**
* Move current focused window to the right

**`'k' + mod2`**
* Move current focused window to the left

### Events

**`windowDidOpen`, `windowDidClose`, `windowDidResize`**
* Perform layout on current screen

### Todo
 - [x] Add ability to resize focused window
 - [x] `'r' + mod1` to reset width
 - [ ] Make primary window default to center-most screen
 - [ ] Add key binding to specify primary column
 - [ ] Add ability to add rows to a column
 - [ ] Pull polyfills upstream into native project
 - [ ] Add persistence for layout settings
