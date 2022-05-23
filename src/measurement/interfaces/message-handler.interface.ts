export interface IMessageHandler {
    writeData(): void
    readData(data: Buffer): void
    onFinish(result: any): void
}
