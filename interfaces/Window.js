declare class Screen extends Identifiable {
  /* custom */
  static mainScreen(): Screen;

  focusWindowToEast(window: Window): boolean;
  focusWindowToWest(window: Window): boolean;

  visibleWindows(): Array<Window>;
  /* end custom */

  static mainScreen(): Screen;
  static screens(): Array<Screen>;
  frameInRectangle(): Rectangle;
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
