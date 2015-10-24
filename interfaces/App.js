declare class App extends Identifiable {
    static launch(appName: string): App;
    static focusedApp(): App;
    static runningApps(): Array<App>;

    processIdentifier(): number;
    bundleIdentifier(): string;
    name(): string;
    isActive(): boolean;
    isHidden(): boolean;
    isTerminated(): boolean;
    mainWindow(): Window;
    windows(): Array<Window>;
    visibleWindows(): Array<Window>;
    activate(): boolean;
    focus(): boolean;
    show(): boolean;
    hide(): boolean;
    terminate(): boolean;
    forceTerminate(): boolean;
}
