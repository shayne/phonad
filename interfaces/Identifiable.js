declare interface Identifiable {
    hash(): number;
    isEqual(object: any): boolean;
}
