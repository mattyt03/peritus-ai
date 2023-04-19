import * as vscode from "vscode";
import getNonce from "./getNonce";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) {
    // TODO: do we need this?
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

  public resolveWebviewView(webviewView: vscode.WebviewView) {
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
          let success = false;
          if (editor) {
            const document = editor.document;
            const selectedText = editor.selection;

            const workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.replace(document.uri, selectedText, data.value);

            await vscode.workspace.applyEdit(workspaceEdit);
            success = true;
          } else {
            vscode.window.showErrorMessage("No file open");
          }
          // this._view?.webview.postMessage({
          //   type: "file-replace",
          //   value: success,
          // });
          break;
        }
        case "get-file-contents": {
          const editor = vscode.window.activeTextEditor;
          let file_contents = "";
          if (editor) {
            file_contents = editor.document.getText();
          }
          this._view?.webview.postMessage({
            type: "file-contents",
            value: file_contents,
          });
          break;
        }
        case "get-selection": {
          const editor = vscode.window.activeTextEditor;
          let selected_code = "";
          let start_line = 0;
          if (editor) {
            const selection = editor.selection;
            selected_code = editor.document.getText(selection);
            // line numbers are 0-based, add 1 for display
            start_line = selection.start.line + 1;
          }
          this._view?.webview.postMessage({
            type: "selection-change",
            value: selected_code,
            start_line: start_line,
          });
          break;
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

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const stylePrismUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "prism.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
    );

    // const scriptUri = webview.asWebviewUri(
    //   vscode.Uri.joinPath(this._extensionUri, "out", "compiled/askPeritus.js")
    // );
    // const styleMainUri = webview.asWebviewUri(
    //   vscode.Uri.joinPath(this._extensionUri, "out", "compiled/askPeritus.css")
    // );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

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

// TODO: Understand content security policy
