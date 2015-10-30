# phonad
A WIP of implementing a Xmonad inspired config for kasper/phoenix

> NOTICE: Currently requires building [my fork of Phoenix](https://github.com/shayne/phoenix) due to pending up-stream pull-requests

## Features

### Key Handlers

**`mod1`** = `alt + shift`

**`mod2`** = `alt + shift - ctrl`

**`'r' + mod2`**
* Reset layout for current screen, clearing ignored windows and specified window ratios

**`'1' + mod2`**
* Perform re-layout

**`'i' + mod1`**
* Focus/Launch iTerm

**`'a' + mod1`**
* Focus/Launch Atom

**`'c' + mod1`**
* Focus/Launch Google Chrome

**`'m' + mod1`**
* Focus/Launch Messages

**`'return' + mod1`**
* Swap current screen focused window frame with center most window

**`'return' + mod2`**
* Move current focused window to next screen

**`'space' + mod1`**
* Switch focus to next screen

**`'t' + mod1`**
* Toggle ignoring of focused window in layout

**`'r' + mod1`**
* Reset fixed width ratio of current focused window

**`'j' + mod1`**
* Decrease the width of current focused window

**`'k' + mod1`**
* Increase the width of current focused window

**`'h' + mod1`**
* Cycle current screen window focus to the left

**`'l' + mod1`**
* Cycle current screen window focus to the right

**`'h' + mod2`**
* Move current focused window to the left

**`'l' + mod2`**
* Move current focused window to the right

### Events

**`start`**
* Perform layout on current screen

**`windowDidFocus`**
* Record as last focused window

**`windowDidOpen`, `windowDidClose`, `windowDidResize`**
* Perform layout on current screen

### Todo
 - [ ] Add ability to persist the WindowService between context reloads
 - [ ] Upgrade support for babel 6
