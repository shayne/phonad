declare class Phoenix {
  static reload: () => {};
  static bind: (key: string, modifiers: Array<string>, callback: Function) => KeyHandler;
  static on: (event: string, callback: Function) => EventHandler;
  static log: (message: any) => void;
  static notify: (message: string) => void;
}
