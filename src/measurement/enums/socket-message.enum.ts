export enum ESocketMessage {
    HTTP_UPGRADE = "GET /rmbt HTTP/1.1\r\n" +
        "Connection: Upgrade\r\n" +
        "Upgrade: RMBT\r\n" +
        "RMBT-Version: 1.2.0\r\n" +
        "\r\n",
    GREETING = "RMBT",
    ACCEPT_TOKEN = "ACCEPT TOKEN",
    TOKEN = "TOKEN",
    OK = "OK",
    CHUNKSIZE = "CHUNKSIZE",
}
