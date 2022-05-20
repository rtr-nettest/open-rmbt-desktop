export enum ESocketMessage {
    HTTP_UPGRADE = `GET /rmbt HTTP/1.1
    Connection: Upgrade
    Upgrade: RMBT
    RMBT-Version: 1.2.0
    `,
}
