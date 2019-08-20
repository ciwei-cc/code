import * as vscode from 'vscode';
import { execFile } from 'child_process';

interface CommandsItem {
    target: any;
    commandId: string;
    method: (...rest: any[]) => any;
    propertyName: string;
}

let allCommands: CommandsItem[] = [];

export function Command(commandId: string): Function {
    return (target: any, propertyName: string, descriptor: any) => {
        allCommands.push({ target, commandId, propertyName, method: descriptor.value });
    };
}

export interface RunOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
    maxBuffer?: number;
}

export function run(file: string, args: ReadonlyArray<string> | null | undefined, options?: RunOptions): Promise<Buffer|string> {
    options = Object.assign(options, { maxBuffer: 100 * 1024 * 1024 });
    return new Promise((resolve, reject) => {
        execFile(file, args, options, (err, stdout) => {
            if (err) {
                resolve(err.message);
            }else{
                resolve(stdout);
            }
        });
    });
}

export default class CommandClass {
    constructor() { }
    public static register(context: vscode.ExtensionContext) {
        allCommands.forEach(command => {
            context.subscriptions.push(vscode.commands.registerCommand(command.commandId, (...args) => {
                return command.method.apply(command.target, args);
            }));
        });
    }
}