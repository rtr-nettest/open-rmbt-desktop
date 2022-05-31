export enum ESocketMessage {
    HTTP_UPGRADE = "GET /rmbt HTTP/1.1\r\n" +
        "Connection: Upgrade\r\n" +
        "Upgrade: RMBT\r\n" +
        "RMBT-Version: 1.2.0\r\n" +
        "\r\n",
    GREETING = "RMBT",
    ACCEPT_TOKEN = "ACCEPT TOKEN",
    TOKEN = "TOKEN",
    OK = "OK\n",
    CHUNKSIZE = "CHUNKSIZE",
    GETCHUNKS = "GETCHUNKS",
    TIME = "TIME",
    ACCEPT_GETCHUNKS = "ACCEPT GETCHUNKS",
    PING = "PING\n",
    PONG = "PONG",
    GETTIME = "GETTIME",
    PUTNORESULT = "PUTNORESULT\n",
    PUT = "PUT\n",
    ERR = "ERR",
}
