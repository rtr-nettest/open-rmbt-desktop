export enum ELoggerMessage {
    CPU_USAGE = "CPU usage is %d",
    CPU_USAGE_MIN = "CPU usage min is %d",
    CPU_USAGE_MAX = "CPU usage max is %d",
    CPU_USAGE_AVG = "CPU usage average is %d",
    NEW_BYTES = "New bytes: %d. New nsec: %d.",
    GET_REQUEST = "GET: %s",
    POST_REQUEST = "POST: %s. Body is: %o",
    RESPONSE = "Response is: %o",
}
