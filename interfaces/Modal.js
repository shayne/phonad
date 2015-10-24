declare class Modal {
    origin: Point;
    duration: number;
    message: string;

    frame(): Rectangle;
    show(): void;
    close(): void;
}
