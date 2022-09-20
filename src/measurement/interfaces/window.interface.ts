export interface Window {
    performance?: {
        now: () => number
    }
    Worker?: any
}
