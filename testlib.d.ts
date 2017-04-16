interface Array<T> {
    map<U>(callbackfn: (value: T, index: number, array: T[]) => string, thisArg?: any): U[];
}
