import * as vscode from 'vscode';
import { client, connection } from "websocket";

export class Terminal implements vscode.Pseudoterminal {
    public userId = 77891;
    public projectId = 194342;
    public shellId = 99;
    public secKey = "99";

    constructor(private context: vscode.ExtensionContext) {
    }

    public get cookie() {
        return this.context.globalState.get("cookie") || "";
    }

    public set cookie(cookie: string) {
        this.context.globalState.update("cookie", cookie);
    }

    //#region interface:vscode.Pseudoterminal
    private ws: client | undefined;
    private conn: connection | undefined;

    private writeEmitter = new vscode.EventEmitter<string>();
    public onDidWrite: vscode.Event<string> = this.writeEmitter.event;

    public open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        if (this.ws) return;
        let self = this;

        self.ws = new client();
        self.conn = undefined;

        self.ws.on('connectFailed', function (error) {
            console.log(error);
            self.ws = undefined;
        });

        self.ws.on('connect', function (connection) {
            self.conn = connection;

            connection.on('error', (err) => { self.conn = undefined; console.log(err); });
            connection.on('close', () => { self.conn = undefined; });
            connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    let data = JSON.parse(message.utf8Data);

                    let kind = data[0];
                    if (kind === "stdout") {
                        let txt = data[1];
                        self.writeEmitter.fire(txt);
                    } else if (kind === "setup") {
                        return;
                    } else {
                        console.log("ERROR:", JSON.stringify(data));
                    }
                }
            });

            if (initialDimensions) self.setDimensions(initialDimensions);
        });

        let url = `wss://aistudio.baidu.com/user/${this.userId}/${this.projectId}//terminals/websocket/${this.shellId}`;
        self.ws.connect(url, "", "https://aistudio.baidu.com", {
            cookie: self.cookie,
            "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
            "Sec-WebSocket-Key": this.secKey,
            "Sec-WebSocket-Version": "13"
        });
    }

    public close(): void {
        this.ws = undefined;
        this.conn = undefined;
    }

    public handleInput(data: string): void {
        if (!this.conn) return;
        this.conn.sendUTF(JSON.stringify(["stdin", data]));
    }

    private dimensionsEmitter = new vscode.EventEmitter<vscode.TerminalDimensions>();
    public onDidOverrideDimensions: vscode.Event<vscode.TerminalDimensions | undefined> = this.dimensionsEmitter.event;
    setDimensions(dimensions: vscode.TerminalDimensions): void {
        if (!this.conn) return;

        this.conn.sendUTF(JSON.stringify(["set_size", dimensions.rows, dimensions.columns, dimensions.rows * 10, dimensions.columns * 10]));
    }
    //#endregion
}