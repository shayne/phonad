# phonad
A WIP of implementing a Xmonad inspired config for kasper/phoenix

## Features

### Key Handlers

  **`mod1`** = `alt + shift`
  
  **`mod2`** = `alt + shift - ctrl`
  
  **`'1' + mod2`**
  * Perform `TALL_RIGHT` layout
  
  **`'i' + mod1`**
  * Focus/Launch iTerm
  
  **`'a' + mod1`**
  * Focus/Launch Atom
  
  **`'c' + mod1`**
  * Focus/Launch Google Chrome
  
  **`'return' + mod1`**
  * Make `Window.focusedWindow()` primary window in current screen's layout
  
  **`'t' + mod1`**
  * Toggle ignoring `Window.focusedWindow()` in layout
  
  **`'h' + mod1`**
  * Increase the width of the primary window
   
  **`'l' + mod1`**
  * Decrease the width of the primary window
  
  **`'j' + mod2`**
  * Cycle current screen window focus to the right
  
  **`'k' + mod2`**
  * Cycle current screen window focus to the left
  
### Events

  **`windowDidOpen`, `windowDidClose`, `windowDidResize`**
  * Perform layout on current screen
  
### Todo
 - [ ] Create middle wide layout
 - [ ] Add ability to cycle layout
 - [ ] Pull polyfills upstream into native project
 - [ ] Add ability to persist ignoredWindows/primaryRation through a reload
