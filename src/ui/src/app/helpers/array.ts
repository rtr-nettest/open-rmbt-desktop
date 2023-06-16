export function generateIndexesOfLength(
    length: number,
    startingIndex = 0,
    fill = 0
) {
    return Array(length)
        .fill(fill)
        .map((_, idx) => startingIndex + idx)
}
