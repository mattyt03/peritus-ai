/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/SidebarProvider.ts":
/*!********************************!*\
  !*** ./src/SidebarProvider.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SidebarProvider = void 0;
const vscode = __webpack_require__(/*! vscode */ "vscode");
const getNonce_1 = __webpack_require__(/*! ./getNonce */ "./src/getNonce.ts");
class SidebarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        // TODO: move this to extension.ts?
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this._doc = editor.document;
            }
        });
        // Set the initial value for _doc
        if (vscode.window.activeTextEditor) {
            this._doc = vscode.window.activeTextEditor.document;
        }
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "replace-in-file": {
                    const editor = vscode.window.activeTextEditor;
                    if (editor && data.value) {
                        const document = editor.document;
                        const selectedText = editor.selection;
                        const workspaceEdit = new vscode.WorkspaceEdit();
                        workspaceEdit.replace(document.uri, selectedText, data.value);
                        await vscode.workspace.applyEdit(workspaceEdit);
                    }
                    break;
                }
                case "get-file-contents": {
                    this._view?.webview.postMessage({
                        type: "file-contents",
                        value: this._doc?.getText(),
                    });
                }
                case "onInfo": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case "onError": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
    }
    revive(panel) {
        this._view = panel;
    }
    _getHtmlForWebview(webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
        const stylePrismUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "prism.css"));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js"));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css"));
        // const scriptUri = webview.asWebviewUri(
        //   vscode.Uri.joinPath(this._extensionUri, "out", "compiled/askPeritus.js")
        // );
        // const styleMainUri = webview.asWebviewUri(
        //   vscode.Uri.joinPath(this._extensionUri, "out", "compiled/askPeritus.css")
        // );
        // Use a nonce to only allow a specific script to be run.
        const nonce = (0, getNonce_1.default)();
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${stylePrismUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const tsvscode = acquireVsCodeApi();
        </script>
			</head>
      <body>
				<script nonce="${nonce}" src="${scriptUri}" ></script>
			</body>
			</html>`;
    }
}
exports.SidebarProvider = SidebarProvider;
// TODO: Understand content security policy


/***/ }),

/***/ "./src/getNonce.ts":
/*!*************************!*\
  !*** ./src/getNonce.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
exports["default"] = getNonce;


/***/ }),

/***/ "vscode":
/*!*************************!*\
  !*** external "vscode" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("vscode");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!**************************!*\
  !*** ./src/extension.ts ***!
  \**************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __webpack_require__(/*! vscode */ "vscode");
const SidebarProvider_1 = __webpack_require__(/*! ./SidebarProvider */ "./src/SidebarProvider.ts");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("peritus-ai-sidebar", sidebarProvider));
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    // context.subscriptions.push disposes of the listener when we're done
    context.subscriptions.push(vscode.commands.registerCommand('peritus-ai.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello from Peritus AI!');
        // HelloWorldPanel.createOrShow(context.extensionUri);
    }));
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
    context.subscriptions.push(vscode.commands.registerCommand('peritus-ai.refresh', async () => {
        // HelloWorldPanel.kill();
        // HelloWorldPanel.createOrShow(context.extensionUri);
        await vscode.commands.executeCommand("workbench.action.closeSidebar");
        await vscode.commands.executeCommand("workbench.view.extension.peritus-ai-sidebar-view");
        // setTimeout(() => {
        // 	vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools");
        // }, 500);
    }));
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
        const { activeTextEditor } = vscode.window;
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
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map