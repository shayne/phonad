/* @flow */

let IGNORED_APPS = [
  'Simulator',
];

const Layouts = {
  TALL_RIGHT: {
    name: 'Tall Right',
  }
};

// DEBUG

function debug(o: any) {
  Phoenix.log(JSON.stringify(o));
}

// START HANDLERS

const keyHandlers: Array<KeyHandler> = [];
const eventHandlers: Array<EventHandler> = [];

const mod1 = ['alt', 'shift'];
const mod2 = ['alt', 'shift', 'ctrl'];

keyHandlers.push(Phoenix.bind('1', mod2, () => {
  const screen = Screen.currentScreen();
  performLayout(Layouts.TALL_RIGHT, { screen });
  showCenteredModalInScreen(Layouts.TALL_RIGHT.name, screen)
}));

keyHandlers.push(Phoenix.bind('i', mod1, () => {
  const app = App.launch("iTerm");
  app.focus();
}));

keyHandlers.push(Phoenix.bind('a', mod1, () => {
  const app = App.launch("Atom");
  app.focus();
}));

keyHandlers.push(Phoenix.bind('c', mod1, () => {
  const app = App.launch("Google Chrome");
  app.focus();
}));

keyHandlers.push(Phoenix.bind('return', mod1, () => {
  performLayout(Layouts.TALL_RIGHT, {
    screen: window.screen(),
    primaryWindow: window,
  });
}));

keyHandlers.push(Phoenix.bind('t', mod1, () => {
  const win = Window.focusedWindow();
  performLayout(Layouts.TALL_RIGHT, {
    screen: win.screen(),
    toggleIgnore: true,
    window: win,
  });
}));

keyHandlers.push(Phoenix.bind('h', mod1, () => {
  const win = Window.focusedWindow();
  performLayout(Layouts.TALL_RIGHT, {
    screen: win.screen(),
    decreaseWidth: true,
    window: win,
  });
}));

keyHandlers.push(Phoenix.bind('l', mod1, () => {
  const win = Window.focusedWindow();
  performLayout(Layouts.TALL_RIGHT, {
    screen: win.screen(),
    increaseWidth: true,
    window: win,
  });
}));

keyHandlers.push(Phoenix.bind('j', mod2, () => {
  performLayout(Layouts.TALL_RIGHT, {
    screen: Screen.currentScreen(),
    window: Window.focusedWindow(),
    moveWindowRight: true
  });
}));

keyHandlers.push(Phoenix.bind('k', mod2, () => {
  performLayout(Layouts.TALL_RIGHT, {
    screen: Screen.currentScreen(),
    window: Window.focusedWindow(),
    moveWindowLeft: true
  });
}));

keyHandlers.push(Phoenix.bind('j', mod1, () => {
  const fwin = Window.focusedWindow();
  fwin.screen().focusWindowToEast(fwin);
}));

keyHandlers.push(Phoenix.bind('k', mod1, () => {
  const fwin = Window.focusedWindow();
  fwin.screen().focusWindowToWest(fwin);
}));

eventHandlers.push(Phoenix.on('windowDidClose', (window: Window) => {
  removeReferencesToWindow(window);
  performLayout(Layouts.TALL_RIGHT, {screen: Screen.currentScreen()});
}));

eventHandlers.push(Phoenix.on('windowDidOpen', (window: Window) => {
  performLayout(Layouts.TALL_RIGHT, { screen: Screen.currentScreen() });
}));

eventHandlers.push(Phoenix.on('windowDidResize', (window: Window) => {
  performLayout(Layouts.TALL_RIGHT, {screen: Screen.currentScreen()});
}));

// END HANDLERS

function showCenteredModalInScreen(message: string, screen: Screen) {
  const m = new Modal();
  m.duration = 1;
  m.message = message;

  const { width: mw, height: mh} = m.frame();
  const { width: sw, height: sh} = screen.visibleFrameInRectangle();

  const mx = (sw / 2) - (mw / 2);
  const my = (sh / 2) - (mh / 2);

  m.origin = {x: mx, y: my};

  m.show();
}

function removeReferencesToWindow(window: Window) {
  const wHash = window.hash();
  // Clear out ignoredWindows cache
  const wIdx = performLayout.ignoredWindows.indexOf(wHash);
  wIdx >= 0 && performLayout.ignoredWindows.splice(wIdx, 1);
  // Clear out ratio cache
  Screen.screens().forEach(s => {
    delete layoutTallRight.winRatios[s.hash()][wHash];
  });
}

type Layout = {name: string};

function performLayout(layout: Layout, options) {
  const layoutFn = getLayoutFn(layout);

  // Toggle ignoring a window
  if (options.toggleIgnore && options.window) {
    const whash = options.window.hash();
    const widx = performLayout.ignoredWindows.indexOf(whash);
    widx >= 0 ? performLayout.ignoredWindows.splice(widx, 1)
      : performLayout.ignoredWindows.push(whash);
  }

  // Filter out ignored apps and windows
  let windows = options.screen.visibleWindows()
    .filter(w => {
      const appName = w.app().name();
      if (IGNORED_APPS.some(n => appName === n)) {
        return false;
      }
      if (performLayout.ignoredWindows.some(h => w.hash() ===h)) {
        return false;
      }
      return true;
    });
  layoutFn(windows, options);
}

performLayout.ignoredWindows = [];

function getLayoutFn(layout: Layout) {
  return layoutTallRight;
}

function layoutTallRight(windows: Array<Window>, options: Object) {
  const screen = options.screen;
  const numWindows = windows.length;

  // Return early if we only have one window
  if (numWindows === 1) {
    const w = windows[0];
    w.setFrame(screen.visibleFrameInRectangle());
    return;
  }

  const sHash = screen.hash();
  const {
    primaryWindow,
    increaseWidth,
    decreaseWidth,
    moveWindowLeft,
    moveWindowRight,
  } = options;

  const {
    x: sX, y: sY,
    width: sWidth, height: sHeight
  } = screen.visibleFrameInRectangle();

  // TODO: make immutable
  // sort windows left to right, put priority win on far right
  windows.sort((a: Window, b: Window) => {
    var aFrame = a.frame(), bFrame = b.frame();
    if (a.isEqual(primaryWindow)) {
      return 1;
    } else if (b.isEqual(primaryWindow)) {
      return -1;
    }
    return aFrame.x - bFrame.x;
  });

  // Move focused window left or right
  if (options.window && moveWindowLeft || moveWindowRight) {
    const window = options.window;
    const win1 = windows.filter(w => w.isEqual(window))[0];
    const idx = windows.indexOf(win1);
    const newIdx = (moveWindowLeft ? idx + 1
      : (idx || numWindows) - 1) % numWindows;
    const nwin = windows[newIdx];
    windows[idx] = nwin;
    windows[newIdx] = window;
  }

  // Resize focused window
  if (options.window && increaseWidth || decreaseWidth) {
    const window = options.window;
    const { width: wWidth, height: wHeight } = window.size();

    const minRatio = 0.16;
    const widthStep = 0.04;

    const numFlowWindows = numWindows - getNumSpecWindows(screen);
    const totalSpecRatio = getTotalSpecRatio(screen);

    const wSpecRatio = getSpecRatios(screen)[window.hash()] || 0;
    // Do not allow specifying all windows as spec windows
    // Only allow up to numWindows - 1 or already specified windows
    if (numFlowWindows > 1 || wSpecRatio) {
      const wCurrentRatio = wSpecRatio || wWidth / sWidth;
      const maxRatio  = 1 - (totalSpecRatio - wSpecRatio) - (minRatio * numFlowWindows);

      const tmpRatio = wCurrentRatio + (increaseWidth ? widthStep : -widthStep);
      const wNewRatio = Math.max(minRatio, Math.min(maxRatio, tmpRatio));

      setSpecRatio(screen, window, wNewRatio);
    } else {
      // TOOD implement resizing of spec windows
      // - If there are *no* windows to flow, we must steal from specified windows
      //  - [ ] your minimum is minRatio
      //  - [ ] your maximum is 1 - (total ratios - yourself)
      //  - [ ] when descreasing in size, redistribute ratio evenly to other windows
      //  - [ ] when increasing in size, steal ratio evenly from other windows
    }
  }

  const specRatios = getSpecRatios(screen);
  const specRatioList = Object.keys(specRatios).map(hash => specRatios[hash]);
  const specWidthMap = {};
  const totalWinWidths = Object.keys(specRatios).reduce((t, hash) => {
    const width = Math.round(specRatios[hash] * sWidth);
    specWidthMap[hash] = width;
    return t += width;
  }, 0);

  const flowWidth = (sWidth - totalWinWidths) /
    Math.max(1, numWindows - getNumSpecWindows(screen));

  let cX = sX;
  windows.forEach((w: Window, i: number) => {
    const x = cX, y = sY, width = specWidthMap[w.hash()] || flowWidth;
    cX += width;
    const newFrame = {
      x, y, height: sHeight,
      width: width
    };
    w.setFrame(newFrame);
    // debug({ newFrame });
  });
}

layoutTallRight.winRatios = {};
Screen.screens().forEach(s => {
  layoutTallRight.winRatios[s.hash()] = { /* win-hash : ratio */ };
});

function getSpecRatios(screenOrHash: Screen|number): Object {
  const sHash = typeof screenOrHash === 'number' ? screenOrHash : screenOrHash.hash();
  return layoutTallRight.winRatios[sHash];
}

function getNumSpecWindows(screenOrHash: Screen|number): number {
  const sHash = typeof screenOrHash === 'number' ? screenOrHash : screenOrHash.hash();
  return Object.keys(getSpecRatios(screenOrHash)).length;
}

function getTotalSpecRatio(screenOrHash: Screen|number): number {
  const sHash = typeof screenOrHash === 'number' ? screenOrHash : screenOrHash.hash();
  const specRatios = getSpecRatios(screenOrHash);
  return Object.keys(specRatios)
    .map(hash => specRatios[hash])
    .reduce((t, r) => t + r, 0);
}

function setSpecRatio(screenOrHash: Screen|number, windowOrHash: Window|number, ratio: number) {
  const sHash = typeof screenOrHash === 'number' ? screenOrHash : screenOrHash.hash();
  const wHash = typeof windowOrHash === 'number' ? windowOrHash : windowOrHash.hash();
  layoutTallRight.winRatios[sHash][wHash] = ratio;
}

// START POLYFILLS

// $FlowFixMe polyfill
Screen.currentScreen = function(): Screen {
  const fwin = Window.focusedWindow();
  return fwin.screen();
}

// $FlowFixMe polyfill
Screen.prototype.visibleWindows = function(): Array<Window> {
  return Window.visibleWindows().filter(w => this.isEqual(w.screen()));
};

// $FlowFixMe polyfill
Screen.prototype.focusWindowToEast = function(window: Window): boolean {
  const windows = this.visibleWindows();

  // sort windows left to right
  windows.sort((a: Window, b: Window) => {
    var aFrame = a.frame(), bFrame = b.frame();
    return aFrame.x - bFrame.x;
  });

  const idx = windows.map(w => w.hash()).indexOf(window.hash());
  const newIdx = (idx || windows.length) - 1 % windows.length;

  return windows[newIdx].focus();
}

// $FlowFixMe polyfill
Screen.prototype.focusWindowToWest = function(window: Window): boolean {
  const windows = this.visibleWindows();

  // sort windows left to right
  windows.sort((a: Window, b: Window) => {
    var aFrame = a.frame(), bFrame = b.frame();
    return aFrame.x - bFrame.x;
  });

  const idx = windows.map(w => w.hash()).indexOf(window.hash());
  const newIdx = (idx + 1) % windows.length;

  return windows[newIdx].focus();
}

// END POLYFILLS

// FLOW HACKS

// Flow bug with not prioritizing libs
declare class Screen extends Identifiable {
  static currentScreen(): Screen;
  static screens(): Array<Screen>;
  screen(): Screen;
  visibleFrameInRectangle(): Rectangle;
  visibleWindows(): Array<Window>;
}
