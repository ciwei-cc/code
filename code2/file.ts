import * as vscode from 'vscode';
import Bubblepost from './bubblepost';

interface Location {
  start: Position;
  end: Position;
}

interface Position {
  line: number;
  column: number;
}

interface Options {
  selection?: Location;
  preserveFocus?: boolean;
  preview?: boolean;
  viewColumn: vscode.ViewColumn;
}

interface FileEvent {
  default: string;
  store: string;
  router: string;
  menu: string;
  page: string;
}

const FileEventMap: Map<string, object> = new Map([
  ["change", {
    default: "onDidChangeTextDocument",
    store: "onDidChangeStoreTextDocument",
    router: "onDidChangeRouterTextDocument",
    menu: "onDidChangeMenuTextDocument",
    page: "onDidChangePageTextDocument"
  }],
  ["save", {
    default: "onDidSaveTextDocument",
    store: "onDidSaveStoreTextDocument",
    router: "onDidSaveRouterTextDocument",
    menu: "onDidSaveMenuTextDocument",
    page: "onDidSavePageTextDocument"
  }]
]);

interface TextDocumentsPath {
  [val: string]: string;
}

class File {
  public textDocumentsPath: TextDocumentsPath = {};
  public textDocumentsMap: Map<string, vscode.TextDocument> = new Map([]);
  static inst: File;

  constructor() {
    if (File.inst) {
      return File.inst;
    }
    File.inst = this;
    this.listen();
  }

  showTextDocument(path: string, options: Options) {
    const pos = (p: Position) => new vscode.Position(p.line, p.column);
    vscode.window.showTextDocument(vscode.Uri.file(path), Object.assign(options, {
      selection: new vscode.Range(pos(options.selection!.start), pos(options.selection!.end))
    }));
  }

  save(fileName: string) {
    return new Promise((resolve) => {
      if (this.textDocumentsMap.has(fileName)) {
        if(this.textDocumentsMap.get(fileName)!.isClosed){
          resolve(false);
        }
        this.textDocumentsMap.get(fileName)!.save().then((data) => {
          resolve(data);
        });
      }else{
        resolve(false);
      }
    });
  }

  listen() {
    const { workspace } = vscode;

    workspace.onDidChangeTextDocument(({ document: textDocument }) => {
      if (!this.textDocumentsMap.has(textDocument.fileName)) {
        this.textDocumentsMap.set(textDocument.fileName, textDocument);
      }
      this._listen(textDocument.fileName, FileEventMap.get("change") as FileEvent, textDocument);
    });

    workspace.onDidSaveTextDocument((textDocument) => {
      this._listen(textDocument.fileName, FileEventMap.get("save") as FileEvent, textDocument);
    });
  }

  private _listen(fileName: string, event: FileEvent, listener: vscode.TextDocument) {
    const { postMessage } = Bubblepost;
    if (fileName.startsWith(this.textDocumentsPath.store)) {
      postMessage(event.store, { listener });
    }
    if (fileName.startsWith(this.textDocumentsPath.router)) {
      postMessage(event.router, { listener });
    }
    if (fileName.startsWith(this.textDocumentsPath.menu)) {
      postMessage(event.menu, { listener });
    }
    if (fileName.startsWith(this.textDocumentsPath.page)) {
      postMessage(event.page, { listener });
    }
    postMessage(event.default, { listener });
  }
}

export default new File();