#!export PATH=/Users/sweeney/.nvm/versions/node/v4.2.1/bin; babel
/* @flow */

let IGNORED_APPS = [
  'Simulator',
  'System Preferences',
  '1Password mini',
  'QuickTime Player',
  'Dictionary',
];

// DEBUG

function debug(o: any) {
  Phoenix.log(JSON.stringify(o));
}

// START HANDLERS

const keyHandlers: Array<KeyHandler> = [];
const eventHandlers: Array<EventHandler> = [];

const mod1 = ['alt', 'shift'];
const mod2 = ['alt', 'shift', 'ctrl'];

keyHandlers.push(Phoenix.bind('r', mod2, () => {
  Phoenix.reload();
}));

keyHandlers.push(Phoenix.bind('1', mod2, () => {
  performLayout(LayoutOptions.NONE);

  const screen = Screen.currentScreen();
  showCenteredModalInScreen('Re-layout', screen)
}));

keyHandlers.push(Phoenix.bind('i', mod1, () => {
  const app = App.launch('iTerm');
  app.focus();
}));

keyHandlers.push(Phoenix.bind('a', mod1, () => {
  const app = App.launch('Atom');
  app.focus();
}));

keyHandlers.push(Phoenix.bind('c', mod1, () => {
  const app = App.launch('Google Chrome');
  app.focus();
}));

keyHandlers.push(Phoenix.bind('m', mod1, () => {
  const app = App.launch('Messages');
  app.focus();
}));

keyHandlers.push(Phoenix.bind('return', mod1, () => {
  performLayout(LayoutOptions.MAKE_PRIMARY);
}));

keyHandlers.push(Phoenix.bind('t', mod1, () => {
  Phoenix.log('Ignoring app: ' + Window.focusedWindow().app().name());
  performLayout(LayoutOptions.TOGGLE_IGNORE);
}));

keyHandlers.push(Phoenix.bind('r', mod1, () => {
  performLayout(LayoutOptions.RESET_WIDTH);
}));

keyHandlers.push(Phoenix.bind('h', mod1, () => {
  performLayout(LayoutOptions.DECREASE_WIDTH);
}));

keyHandlers.push(Phoenix.bind('l', mod1, () => {
  performLayout(LayoutOptions.INCREASE_WIDTH);
}));

keyHandlers.push(Phoenix.bind('j', mod2, () => {
  performLayout(LayoutOptions.MOVE_RIGHT);
}));

keyHandlers.push(Phoenix.bind('k', mod2, () => {
  performLayout(LayoutOptions.MOVE_LEFT);
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
  performLayout(LayoutOptions.NONE);
}));

eventHandlers.push(Phoenix.on('windowDidOpen', (window: Window) => {
  performLayout(LayoutOptions.NONE);
}));

eventHandlers.push(Phoenix.on('windowDidResize', (window: Window) => {
  performLayout(LayoutOptions.NONE);
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
  const wIdx = IgnoredWindows.indexOf(wHash);
  wIdx >= 0 && IgnoredWindows.splice(wIdx, 1);
  // Clear out ratio cache
  Screen.screens().forEach(s => {
    delete SpecWinRatios[s.hash()][wHash];
  });
}

// START LAYOUT


var LayoutOptions = keyMirror({
  NONE: null,
  MAKE_PRIMARY: null,
  TOGGLE_IGNORE: null,
  DECREASE_WIDTH: null,
  INCREASE_WIDTH: null,
  MOVE_RIGHT: null,
  MOVE_LEFT: null,
  RESET_WIDTH: null,
});

type LayoutOption = $Enum<typeof LayoutOptions>;

const IgnoredWindows = [];

function performLayout(option: LayoutOption) {
  const window = Window.focusedWindow();
  const screen = Screen.currentScreen();
  const sHash = screen.hash();

  // Toggle ignoring a window
  if (option === LayoutOptions.TOGGLE_IGNORE) {
    const wHash = window.hash();
    const wIdx = IgnoredWindows.indexOf(wHash);
    wIdx >= 0 ? IgnoredWindows.splice(wIdx, 1)
      : IgnoredWindows.push(wHash);
  }

  if (option === LayoutOptions.RESET_WIDTH) {
    delete SpecWinRatios[sHash][window.hash()];
  }

  // Filter out ignored apps/windows
  const visibleWindowHashes = [];
  let windows = screen.visibleWindows()
    .filter(w => {
      const wHash = w.hash();
      visibleWindowHashes.push(wHash);
      const appName = w.app().name();
      if (IGNORED_APPS.some(n => appName === n)) {
        return false;
      }
      if (IgnoredWindows.some(h => wHash === h)) {
        return false;
      }
      return true;
    });

    // Sometimes we don't receive onWindowDidClose, so
    // we'll remove ratios for stale windows
    Object.keys(SpecWinRatios[sHash]).forEach(rHs => {
      const rH = parseInt(rHs);
      if (visibleWindowHashes.indexOf(rH) === -1) {
        Phoenix.log('Removing from SpecWinRatios: ' + rH);
        delete SpecWinRatios[sHash][rH];
      }
    });

    _performLayout(option, screen, windows, window);
}

const SpecWinRatios = {};
_buildSpecWinRatios();
function _buildSpecWinRatios() {
  Screen.screens().forEach(s => {
    SpecWinRatios[s.hash()] = { /* win-hash : ratio */ };
  });
}

function _performLayout(option: LayoutOption, screen: Screen, windows: Array<Window>, window: Window) {
  const numWindows = windows.length;

  // Return early if we only have one window
  if (numWindows === 1) {
    _buildSpecWinRatios();
    IgnoredWindows.splice(0, IgnoredWindows.length);
    const w = windows[0];
    w.setFrame(screen.visibleFrameInRectangle());
    return;
  }

  const sHash = screen.hash();
  const wHash = window.hash();

  const {
    x: sX, y: sY,
    width: sWidth, height: sHeight
  } = screen.visibleFrameInRectangle();

  // Make primary -- RETURNS!
  if (option === LayoutOptions.MAKE_PRIMARY) {
    let cw = null;
    let cwScore = 100; // needs to be an impossibly large ratio
    const centerPoints = { x1: sWidth / 3, x2: sWidth / 3 * 2 };

    windows.forEach(w => {
      const {x, width } = w.frame();
      const score = Math.abs(
        1 - ((x / centerPoints.x1) + ((x + width) / centerPoints.x2)) / 2
      );
      if (cwScore > score) {
        cwScore = score;
        cw = w;
      }
    });

    if (cw && !cw.isEqual(window)) {
      const cwHash = cw.hash();

      const cwFrame = cw.frame();
      cw.setFrame(window.frame());
      window.setFrame(cwFrame);

      const wRatio = SpecWinRatios[sHash][wHash];
      const cwRatio = SpecWinRatios[sHash][cwHash];
      delete SpecWinRatios[sHash][cwHash];
      delete SpecWinRatios[sHash][wRatio];
      cwRatio && setSpecRatio(screen, window, cwRatio);
      wRatio && setSpecRatio(screen, cw, wRatio);
    }
    return;
  }

  // TODO: make immutable
  // sort windows left to right
  windows.sort((a: Window, b: Window) => {
    var aFrame = a.frame(), bFrame = b.frame();
    return aFrame.x - bFrame.x;
  });

  // Move focused window left or right
  if (option === LayoutOptions.MOVE_RIGHT || option === LayoutOptions.MOVE_LEFT) {
    const win1 = windows.filter(w => w.isEqual(window))[0];
    const idx = windows.indexOf(win1);
    const newIdx = (option === LayoutOptions.MOVE_LEFT
      ? idx + 1 : (idx || numWindows) - 1) % numWindows;
    const nwin = windows[newIdx];
    windows[idx] = nwin;
    windows[newIdx] = window;
  }

  // Resize focused window
  if (option === LayoutOptions.INCREASE_WIDTH || option === LayoutOptions.DECREASE_WIDTH) {
    const { width: wWidth, height: wHeight } = window.size();

    const minRatio = 0.16;
    const widthStep = 0.04;

    const numFlowWindows = numWindows - getNumSpecWindows(screen);
    const totalSpecRatio = getTotalSpecRatio(screen);

    const specRatios = getSpecRatios(screen);
    const wSpecRatio = specRatios[window.hash()] || 0;
    const wCurrentRatio = wSpecRatio || wWidth / sWidth;
    const tmpRatio = wCurrentRatio +
      (option === LayoutOptions.INCREASE_WIDTH ? widthStep : -widthStep);

    if (numFlowWindows - ((wSpecRatio > 0) ? 0 : 1) >= 1) {
      const maxRatio  = 1 - (totalSpecRatio - wCurrentRatio) - (minRatio * numFlowWindows);
      const wNewRatio = Math.max(minRatio, Math.min(maxRatio, tmpRatio));
      setSpecRatio(screen, window, wNewRatio);
    } else {
      const maxRatio = 1 - (totalSpecRatio - wSpecRatio);
      const wMaxRatio = maxRatio +
        ((option === LayoutOptions.INCREASE_WIDTH) ? widthStep : -widthStep);
      const wNewRatio = Math.max(minRatio, Math.min(wMaxRatio, tmpRatio));
      setSpecRatio(screen, window, wNewRatio);

      const delta = (wNewRatio - wCurrentRatio) / (numWindows - 1);

      Object.keys(specRatios).forEach(wHs => {
        const wH = parseInt(wHs);
        if (wH === wHash) return;
        const wCurrentRatio = specRatios[wH];
        const wNewRatio = wCurrentRatio - delta;
        setSpecRatio(screen, wH, wNewRatio);
      });
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
  // Phoenix.log('Layout finished');
}

function getSpecRatios(screenOrHash: Screen|number): Object {
  const sHash = typeof screenOrHash === 'number' ? screenOrHash : screenOrHash.hash();
  return SpecWinRatios[sHash];
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
  SpecWinRatios[sHash][wHash] = ratio;
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

// START UTILS

function keyMirror(obj) {
  var ret = {};
  var key;
  if (!(obj instanceof Object && !Array.isArray(obj))) {
    throw new Error('keyMirror(...): Argument must be an object.');
  }
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      ret[key] = key;
    }
  }
  return ret;
};

// END LIBS

// FLOW HACKS

// Flow bug with not prioritizing libs
declare class Screen extends Identifiable {
  static currentScreen(): Screen;
  static screens(): Array<Screen>;
  screen(): Screen;
  visibleFrameInRectangle(): Rectangle;
  visibleWindows(): Array<Window>;
}
