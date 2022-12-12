/**
 * This function returns a full copy of an object including its methods,
 * and extends it with a specified list of objects.
 * @param obj The source object we want to copy
 * @param args One or few objects we want to use to extend the source object
 */
export function extend<T>(obj: object, ...args: any[]): T {
    return Object.assign(
        Object.create(Object.getPrototypeOf(obj)),
        obj,
        ...args
    )
}
