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

const DEBUG = false;

function debug(message: any) {
  if (!DEBUG) return;
  if (typeof message == 'string') Phoenix.log(message);
  else Phoenix.log(JSON.stringify(message));
}

// START HANDLERS

const keyHandlers: Array<KeyHandler> = [];
const eventHandlers: Array<EventHandler> = [];

const mod1 = ['alt', 'shift'];
const mod2 = ['alt', 'shift', 'ctrl'];

keyHandlers.push(Phoenix.bind('r', mod2, () => {
  WindowService.resetScreen(Screen.mainScreen());
  performLayout();
  showCenteredModal('Reset Layout');
}));

keyHandlers.push(Phoenix.bind('1', mod2, () => {
  performLayout();

  showCenteredModal('Re-layout')
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

keyHandlers.push(Phoenix.bind('return', mod2, () => {
  performLayout(LayoutOptions.SWITCH_SCREEN);
}));

keyHandlers.push(Phoenix.bind('space', mod1, () => {
  WindowService.setFocusedWindow(Window.focusedWindow());
  const nextScreen = Screen.mainScreen().next();
  const window = WindowService.getFocusedWindowForScreen(nextScreen) ||
    nextScreen.visibleWindows()[0].focus();
  window.focus();
}));

keyHandlers.push(Phoenix.bind('t', mod1, () => {
  debug('Ignoring app: ' + Window.focusedWindow().app().name());
  performLayout(LayoutOptions.TOGGLE_IGNORE);
}));

keyHandlers.push(Phoenix.bind('r', mod1, () => {
  performLayout(LayoutOptions.RESET_RATIO);
}));

keyHandlers.push(Phoenix.bind('j', mod1, () => {
  performLayout(LayoutOptions.DECREASE_WIDTH);
}));

keyHandlers.push(Phoenix.bind('k', mod1, () => {
  performLayout(LayoutOptions.INCREASE_WIDTH);
}));

keyHandlers.push(Phoenix.bind('h', mod1, () => {
  const fwin = Window.focusedWindow();
  focusWindowToLeft(fwin);
}));

keyHandlers.push(Phoenix.bind('l', mod1, () => {
  const fwin = Window.focusedWindow();
  focusWindowToRight(fwin);
}));

keyHandlers.push(Phoenix.bind('h', mod2, () => {
  performLayout(LayoutOptions.MOVE_LEFT);
}));

keyHandlers.push(Phoenix.bind('l', mod2, () => {
  performLayout(LayoutOptions.MOVE_RIGHT);
}));

eventHandlers.push(Phoenix.on('start', (window: Window) => {
  performLayout();
}));

eventHandlers.push(Phoenix.on('windowDidFocus', (window: Window) => {
  debug('windowDidFocus');
  WindowService.setFocusedWindow(window);
}));

eventHandlers.push(Phoenix.on('windowDidClose', (window: Window) => {
  debug('Window did close: ' + window.app().name());
  const app = window.app();
  debug({
    wIsNormal: window.isNormal(),
    wIsMinimized: window.isMinimized(),
    aIsActive: app.isActive(),
    aIsHidden: app.isHidden(),
    aIsTerminated: app.isTerminated(),
  });
  WindowService.resetWindow(window);
  performLayout();
}));

eventHandlers.push(Phoenix.on('windowDidOpen', (window: Window) => {
  WindowService.addWindow(window);
  performLayout();
}));

eventHandlers.push(Phoenix.on('windowDidResize', (window: Window) => {
  performLayout();
}));

// END HANDLERS

function showCenteredModal(message: string) {
  const m = new Modal();
  m.duration = 1;
  m.message = message;

  const sFrame = Screen.mainScreen().visibleFrame();

  const { width: mW, height: mH} = m.frame();
  const { x: sX, y: sY, width: sW, height: sH} = sFrame;

  const mX = Math.round((sW / 2) - (mW / 2));
  const mY = Math.round((sH / 2) - (mH / 2));

  m.origin = {x: sX + mX, y: sY + mY};

  m.show();
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
  RESET_RATIO: null,
  SWITCH_SCREEN: null,
});

type LayoutOption = $Enum<typeof LayoutOptions>;

// const IgnoredWindows = [];

function performLayout(option: LayoutOption = LayoutOptions.NONE) {
  const window = Window.focusedWindow();
  const screen = window.screen();

  WindowService.addWindow(window);

  // Toggle ignoring a window
  if (option === LayoutOptions.TOGGLE_IGNORE) {
    WindowService.toggleIgnore(window);
  }

  if (option === LayoutOptions.RESET_RATIO) {
    WindowService.unsetRatio(window);
  }

  if (option === LayoutOptions.SWITCH_SCREEN) {
    const nextScreen = window.screen().next();
    const { y: sY } = nextScreen.visibleFrameInRectangle();
    window.setFrame({x: 0, y: sY, width: 0, height: 0});
    WindowService.resetWindow(window);
  }

  // Filter out ignored apps/windows
  let windows = screen.visibleWindows()
    .filter(w => {
      WindowService.addWindow(w);
      if (IGNORED_APPS.indexOf(w.app().name()) > -1 ||
          WindowService.isIgnored(w)) {
        return false;
      }
      return true;
    });

    // Sometimes we don't receive onWindowDidClose, so
    // we'll remove ratios for stale windows
    WindowService.resetInvalidWindows();

    _performLayout(option, screen, windows, window);
}

function _performLayout(option: LayoutOption, screen: Screen, windows: Array<Window>, window: Window) {
  const numWindows = windows.length;

  // Return early if we only have one window
  if (numWindows === 1) {
    WindowService.reset();
    const w = windows[0];
    w.setFrame(screen.visibleFrameInRectangle());
    return;
  }

  const wHash = `${window.hash()}`;

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
      const cwFrame = cw.frame();
      cw.setFrame(window.frame());
      window.setFrame(cwFrame);

      const wRatio = WindowService.getRatio(window);
      const cwRatio = WindowService.getRatio(cw);
      WindowService.unsetRatio(window);
      WindowService.unsetRatio(cw);
      cwRatio && WindowService.setRatio(window, cwRatio);
      wRatio && WindowService.setRatio(cw, wRatio);
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
    const newIdx = (option === LayoutOptions.MOVE_RIGHT
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

    const ratios = WindowService.ratiosForScreen(screen);
    const ratioWindows = Object.keys(ratios);

    const numFlowWindows = numWindows - ratioWindows.length;
    const totalSpecRatio = ratioWindows.reduce((t, h) => t + ratios[h], 0);

    const wSpecRatio = ratios[`${window.hash()}`] || 0;
    const wCurrentRatio = wSpecRatio || wWidth / sWidth;
    const tmpRatio = wCurrentRatio +
      (option === LayoutOptions.INCREASE_WIDTH ? widthStep : -widthStep);

    if (numFlowWindows - ((wSpecRatio > 0) ? 0 : 1) >= 1) {
      const maxRatio  = 1 - (totalSpecRatio - wCurrentRatio) - (minRatio * numFlowWindows);
      const wNewRatio = Math.max(minRatio, Math.min(maxRatio, tmpRatio));
      WindowService.setRatio(window, wNewRatio);
    } else {
      const maxRatio = 1 - (totalSpecRatio - wSpecRatio);
      const wMaxRatio = maxRatio +
        ((option === LayoutOptions.INCREASE_WIDTH) ? widthStep : -widthStep);
      const wNewRatio = Math.max(minRatio, Math.min(wMaxRatio, tmpRatio));
      WindowService.setRatio(window, wNewRatio);

      const delta = (wNewRatio - wCurrentRatio) / (numWindows - 1);

      ratioWindows.forEach(wH => {
        if (wH === wHash) return;
        const wCurrentWindow = WindowService.getWindow(wH);
        const wCurrentRatio = ratios[wH];
        const wNewRatio = wCurrentRatio - delta;
        WindowService.setRatio(wCurrentWindow, wNewRatio);
      });
    }
  }

  const ratios = WindowService.ratiosForScreen(screen);
  const ratioWindows = Object.keys(ratios);
  const specRatioList = ratioWindows.map(hash => ratios[hash]);
  const specWidthMap = {};
  const totalWinWidths = ratioWindows.reduce((t, hash) => {
    const width = Math.round(ratios[hash] * sWidth);
    specWidthMap[hash] = width;
    return t += width;
  }, 0);

  const flowWidth = (sWidth - totalWinWidths) /
    Math.max(1, numWindows - ratioWindows.length);

  let cX = sX;
  windows.forEach((w: Window, i: number) => {
    const x = cX, y = sY, width = specWidthMap[`${w.hash()}`] || flowWidth;
    cX += width;
    const newFrame = {
      x, y, height: sHeight,
      width: width
    };
    w.setFrame(newFrame);
    // debug({ newFrame });
  });
  debug('Layout finished');
}

function focusWindowToLeft(window: Window): boolean {
  const windows = window.screen().visibleWindows();

  // sort windows left to right
  windows.sort((a: Window, b: Window) => {
    var aFrame = a.frame(), bFrame = b.frame();
    return aFrame.x - bFrame.x;
  });

  const idx = windows.map(w => `${w.hash()}`).indexOf(`${window.hash()}`);
  const newIdx = (idx || windows.length) - 1 % windows.length;

  return windows[newIdx].focus();
}

function focusWindowToRight(window: Window): boolean {
  const windows = window.screen().visibleWindows();

  // sort windows left to right
  windows.sort((a: Window, b: Window) => {
    var aFrame = a.frame(), bFrame = b.frame();
    return aFrame.x - bFrame.x;
  });

  const idx = windows.map(w => `${w.hash()}`).indexOf(`${window.hash()}`);
  const newIdx = (idx + 1) % windows.length;

  return windows[newIdx].focus();
}

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

type WindowMap = { [key: string]: Window };
type FocusMap = { [key: string]: Window };
type WindowRatioMap = { [key: string]: number };
type RatioWindows = { [key: string]: WindowRatioMap }

const WindowService = new (class {
  windows: WindowMap;
  focusMap: FocusMap;
  ignoredWindows: Array<string>;
  ratioWindows: RatioWindows;

  constructor() {
    this.windows = {};
    this.focusMap = {};
    this.ignoredWindows = [];
    this.ratioWindows = {};

    Window.windows().forEach(w => this.windows[`${w.hash()}`] = w);
    Screen.screens().forEach(s => this.ratioWindows[`${s.hash()}`] = {});
  }

  addWindow(window: Window) {
    this.windows[`${window.hash()}`] = window;
  }

  reset() {
    this.constructor();
  }

  resetScreen(screen: Screen) {
    this.ignoredWindows.forEach(hash => {
      const window = this.getWindow(hash);
      if (this.isIgnored(window)) {
        this.toggleIgnore(window);
      }
    });
    this.ratioWindows[`${screen.hash()}`] = {};
  }

  resetWindow(window: Window) {
    this.unsetRatio(window);
    if (this.isIgnored(window)) {
      this.toggleIgnore(window);
    }
    delete this.windows[`${window.hash()}`];
  }

  isValidWindow(window: Window) {
    const isValid = window && window.isNormal() && !window.isMinimized() &&
          window.app() && !window.app().isHidden() && !window.app().isTerminated();
    return isValid;
  }

  resetInvalidWindows() {
    Object.keys(this.windows).forEach(hash => {
      const window = this.windows[hash];
      if (!this.isValidWindow(window)) {
        delete this.windows[hash];
        this.resetWindow(window);
      }
    });
  }

  getWindow(hash: string) {
    return this.windows[hash];
  }

  isIgnored(window: Window): boolean {
    return this.ignoredWindows.indexOf(`${window.hash()}`) > -1;
  }

  toggleIgnore(window: Window) {
    if (this.isIgnored(window)) {
      const idx = this.ignoredWindows.indexOf(`${window.hash()}`);
      delete this.ignoredWindows[idx];
    } else {
      this.ignoredWindows.push(`${window.hash()}`);
    }
  }

  clearIgnored() {
    this.ignoredWindows = [];
  }

  ratiosForScreen(screen: Screen) {
    const visibleWindows = screen.visibleWindows();
    const allRatioWindows = this.ratioWindows[`${screen.hash()}`];
    const validRatioWindows = Object.keys(allRatioWindows).reduce( (obj, hash) => {
      const window = this.getWindow(hash);
      if (visibleWindows.some(w => w.isEqual(window))) {
        // $FlowFixMe computed properties
        return { ...obj, [hash]: allRatioWindows[hash] };
      }
      return obj;
    }, {});
    return validRatioWindows;
  }

  getRatio(window: Window) {
    return this.ratioWindows[`${window.screen().hash()}`][`${window.hash()}`];
  }

  setRatio(window: Window, ratio: number) {
    this.ratioWindows[`${window.screen().hash()}`][`${window.hash()}`] = ratio;
  }

  unsetRatio(window: Window) {
    delete this.ratioWindows[`${window.screen().hash()}`][`${window.hash()}`];
  }

  setFocusedWindow(window: Window) {
    this.addWindow(window);
    this.focusMap[`${window.screen().hash()}`] = window;
  }

  getFocusedWindowForScreen(screen: Screen) {
    return this.focusMap[`${screen.hash()}`];
  }

});

// END LIBS

// FLOW DECLARATIONS
// BUG: Flow does not load declarations in libs for Screen and Window

declare class Screen extends Identifiable {
  static mainScreen(): Screen;
  static screens(): Array<Screen>;
  frameInRectangle(): Rectangle;
  windows(): Array<Window>;
  visibleWindows(): Array<Window>;
  visibleFrame(): Rectangle;
  visibleFrameInRectangle(): Rectangle;
  next(): Screen;
  previous(): Screen;
}

declare class Window extends Identifiable {
  static focusedWindow(): Window;
  static windows(): Array<Window>;
  static visibleWindows(): Array<Window>;
  static visibleWindowsInOrder(): Array<Window>;

  otherWindowsOnSameScreen(): Array<Window>;
  otherWindowsOnAllScreens(): Array<Window>;
  title(): string;
  isMain(): boolean;
  isNormal(): boolean;
  isMinimized(): boolean;
  app(): App;
  screen(): Screen;
  topLeft(): Point;
  size(): Size;
  frame(): Rectangle;
  setTopLeft(point: Point): boolean;
  setSize(size: Size): boolean;
  setFrame(frame: Rectangle): boolean;
  maximize(): boolean;
  minimize(): boolean;
  unminimize(): boolean;
  windowsToWest(): Array<Window>;
  windowsToEast(): Array<Window>;
  windowsToNorth(): Array<Window>;
  windowsToSouth(): Array<Window>;
  focus(): boolean;
  focusClosestWindowInWest(): boolean;
  focusClosestWindowInEast(): boolean;
  focusClosestWindowInNorth(): boolean;
  focusClosestWindowInSouth(): boolean;
}

// END FLOW DECLARATIONS
