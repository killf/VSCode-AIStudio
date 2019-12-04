import * as vscode from 'vscode';
import { Terminal } from './terminal';
import { Api } from './api';

let terminal: Terminal;
let api: Api;

async function setCookie() {
	let cookie = await vscode.window.showInputBox({ prompt: "Set Cookie for AIStuio." });
	if (cookie) {
		terminal.cookie = cookie;
	}
}

async function openTerminal() {
	let handle = vscode.window.createTerminal({ name: `AIStudio Terminal`, pty: terminal });
	handle.show();
}

async function test() {
	vscode.window.showInformationMessage('cookie:' + terminal.cookie);
	let data = await api.project_self_list();
	console.log(JSON.stringify(data));
}

export function activate(context: vscode.ExtensionContext) {
	if (!terminal) terminal = new Terminal(context);
	if (!api) api = new Api(context);

	context.subscriptions.push(vscode.commands.registerCommand('AIStudio.setCookie', setCookie));
	context.subscriptions.push(vscode.commands.registerCommand('AIStudio.openTerminal', openTerminal));
	context.subscriptions.push(vscode.commands.registerCommand('AIStudio.test', test));
}

export function deactivate() { }
