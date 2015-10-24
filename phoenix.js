/* @flow */

let IGNORED_APPS = [
  'Simulator',
];

const Layouts = {
  TALL_RIGHT: {
    name: 'Tall Right',
  }
};

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

keyHandlers.push(Phoenix.bind('return', mod1, () => {
  makePrimary(Window.focusedWindow());
}));

keyHandlers.push(Phoenix.bind('t', mod1, () => {
  const app = App.launch("iTerm");
  app.focus();
}));

keyHandlers.push(Phoenix.bind('a', mod1, () => {
  const app = App.launch("Atom");
  app.focus();
}));

keyHandlers.push(Phoenix.bind('h', mod1, () => {
  performLayout(Layouts.TALL_RIGHT, {
    screen: Screen.currentScreen(),
    increasePrimary: true
  });
}));

keyHandlers.push(Phoenix.bind('l', mod1, () => {
  performLayout(Layouts.TALL_RIGHT, {
    screen: Screen.currentScreen(),
    decreasePrimary: true
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
  performLayout(Layouts.TALL_RIGHT, {screen: Screen.currentScreen()});
}));

eventHandlers.push(Phoenix.on('windowDidOpen', (window: Window) => {
  performLayout(Layouts.TALL_RIGHT, { screen });
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

function makePrimary(window: Window) {
  performLayout(Layouts.TALL_RIGHT, {
    screen: window.screen(),
    primaryWindow: window,
  });
}

type Layout = {name: string};

function performLayout(layout: Layout, options) {
  const layoutFn = getLayoutFn(layout);
  let windows = options.screen.visibleWindows()
    .filter(w => {
      const appName = w.app().name();
      return !IGNORED_APPS.some(n => appName === n);
    });
  layoutFn(windows, options);
}

function getLayoutFn(layout: Layout) {
  return layoutTallRight;
}

function layoutTallRight(windows: Array<Window>, options: Object) {
  const screen = options.screen;
  const shash = screen.hash();
  const {
    primaryWindow,
    increasePrimary,
    decreasePrimary,
    moveWindowLeft,
    moveWindowRight,
    window,
  } = options;

  const phash = primaryWindow && primaryWindow.hash();

  let primaryRatio = layoutTallRight[shash].primaryRatio;

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

  const numWindows = windows.length;

  // full-screen for 1 window
  if (numWindows === 1) {
    const w = windows[0];
    w.setFrame(screen.visibleFrameInRectangle());
    return;
  }

  if (moveWindowLeft || moveWindowRight) {
    const win1 = windows.filter(w => w.isEqual(window))[0];
    const idx = windows.indexOf(win1);
    const newIdx = (moveWindowLeft ? idx + 1
      : (idx || numWindows) - 1) % numWindows;
    const nwin = windows[newIdx];
    windows[idx] = nwin;
    windows[newIdx] = window;
  }

  const {
    x: sx, y: sy,
    width: swidth, height: sheight
  } = screen.visibleFrameInRectangle();

  if (increasePrimary || decreasePrimary) {
    primaryRatio += (increasePrimary ? 0.03 : -0.03);
  }

  primaryRatio = Math.min(Math.max(primaryRatio, 0.05), 0.95);
  layoutTallRight[shash].primaryRatio = primaryRatio;

  const priWidth = Math.round(swidth * primaryRatio);
  const winWidth = (swidth - priWidth) / (numWindows - 1);

  let cx = sx;
  windows.forEach((w: Window, i: number) => {
    const x = cx, y = sy;
    cx += winWidth;
    const newFrame = {
      x, y, height: sheight,
      width: i === (windows.length - 1) ? priWidth : winWidth,
    };
    w.setFrame(newFrame);
    // Phoenix.log('\n' + w.title() + '\n\t' + JSON.stringify(newFrame));
  });
}

Screen.screens().forEach(s => {
  layoutTallRight[s.hash()] = { primaryRatio: 0.5 };
});

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
