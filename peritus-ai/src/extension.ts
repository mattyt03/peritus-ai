// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { HelloWorldPanel } from './HelloWorldPanel';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "peritus-ai" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	context.subscriptions.push(
		vscode.commands.registerCommand('peritus-ai.helloWorld', () => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			vscode.window.showInformationMessage('Hello from Peritus AI!');
			HelloWorldPanel.createOrShow(context.extensionUri);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('peritus-ai.askQuestion', async () => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			const answer = await vscode.window.showInformationMessage("How was your day?", "good", "bad");
			if (answer === "bad") {
				vscode.window.showInformationMessage("Sorry to hear that");
			} else {
				console.log(answer);
			}
		})
	);

}

// This method is called when your extension is deactivated
export function deactivate() {}
