// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { HelloWorldPanel } from './HelloWorldPanel';
import { SidebarProvider } from './SidebarProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
		"peritus-ai-sidebar",
		sidebarProvider
		)
	);



	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	// context.subscriptions.push disposes of the listener when we're done
	context.subscriptions.push(
		vscode.commands.registerCommand('peritus-ai.helloWorld', () => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			vscode.window.showInformationMessage('Hello from Peritus AI!');
			// HelloWorldPanel.createOrShow(context.extensionUri);
		})
	);

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('peritus-ai.askQuestion', async () => {
	// 		const answer = await vscode.window.showInformationMessage("How was your day?", "good", "bad");
	// 		if (answer === "bad") {
	// 			vscode.window.showInformationMessage("Sorry to hear that");
	// 		} else {
	// 			console.log(answer);
	// 		}
	// 	})
	// );

	context.subscriptions.push(
		vscode.commands.registerCommand('peritus-ai.refresh', async () => {
			// HelloWorldPanel.kill();
			// HelloWorldPanel.createOrShow(context.extensionUri);
			await vscode.commands.executeCommand("workbench.action.closeSidebar");
			await vscode.commands.executeCommand("workbench.view.extension.peritus-ai-sidebar-view");
			// setTimeout(() => {
			// 	vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools");
			// }, 500);
		})
	);
	
	context.subscriptions.push(
		vscode.commands.registerCommand('peritus-ai.error', async () => {
			vscode.commands.onError(async () => {
				vscode.commands.showErrorMessage("Error Found! Debug with Peritus?", "Yes", "No")
			})
		})
	);
	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('peritus-ai.addTodo', async () => {
	// 		const {activeTextEditor} = vscode.window;
	// 		if (!activeTextEditor) {
	// 			vscode.window.showInformationMessage("No active text editor");
	// 			return;
	// 		}
	// 		// add check if text is empty
	// 		const text = activeTextEditor.document.getText(activeTextEditor.selection);
	// 		// vscode.window.showInformationMessage("Text: " + text);
	// 		sidebarProvider._view?.webview.postMessage({
	// 			type: 'new-todo',
	// 			value: text,
	// 		});
	// 	})
	// );

	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => {
		const {activeTextEditor} = vscode.window;
		if (!activeTextEditor)
			return;
		// if (activeTextEditor.selection.isEmpty)
		// 	return;
		// vscode.window.showInformationMessage("Selection changed");
		const selection = activeTextEditor.selection;
		const selected_code = activeTextEditor.document.getText(selection);
		// line numbers are 0-based, add 1 for display
		const start_line = selection.start.line + 1; 
		
		sidebarProvider._view?.webview.postMessage({
			type: 'selection-change',
			value: selected_code,
			start_line: start_line,
		});
	}));

	

	// context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
	// 	vscode.window.showInformationMessage("File changed");
	// 	if (vscode.window.activeTextEditor && event.document.uri === vscode.window.activeTextEditor.document.uri) {
	// 		const text = event.document.getText();
	// 		console.log(text);
	// 		sidebarProvider._view?.webview.postMessage({
	// 			type: 'file-change',
	// 			value: text,
	// 		});
	// 	}
	// }));
}

// This method is called when your extension is deactivated
export function deactivate() {}
