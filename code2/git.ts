import { Command, run, RunOptions } from './common';
import { window, workspace, extensions, commands } from 'vscode';

interface AnyObj {
    [value: string]: any;
}
interface GitInfo extends AnyObj {
    version: string;
    path: string;
    config: AnyObj;
}

export enum GitCommand {
    Init = 'git.ms.init',
    Add = 'git.ms.add',
    Config = 'git.ms.config',
    Commit = 'git.ms.commit',
    Pull = 'git.ms.pull',
    Push = 'git.ms.push',
    Fetch = 'git.ms.fetch',
    Log = 'git.ms.log',
    Remote = 'git.ms.remote',
    Status = 'git.ms.status'
}

const gitUserCheckMap: Map<string, boolean> = new Map([
    ['commit', true],
    ['push', true]
]);

class Git {
    public static enable: boolean;
    public static gitInfo: GitInfo = {
        version: '',
        path: '',
        config: {}
    };
    public static repoPath: string = '';
    constructor() {
        Git.enable = workspace.getConfiguration('git', null!).get<boolean>('enabled', true);
        if (!Git.enable) {
            GitMsg.showGitUnableMessage();
        } else {
            this.getGitInfo();
        }
    }
    async getGitInfo() {
        try {
            const gitExtension = extensions.getExtension('vscode.git');
            if (gitExtension !== undefined) {
                const gitApi = ((gitExtension.isActive ? gitExtension.exports : await gitExtension.activate())).getAPI(1);
                Git.gitInfo.path = gitApi.git.path || workspace.getConfiguration('git').get<string>('path');
                Git.gitInfo.version = await this.runGit({}, ['--version']);
            }
        } catch (err) {
            GitMsg.showGitUnableMessage(`${err}`);
        }
    }

    @Command(GitCommand.Init)
    async init() {
        return await this.runGit({}, 'init');
    }

    @Command(GitCommand.Add)
    async add(args: string[] = []) {
        return await this.runGit({}, ...['add', ...args]);
    }

    @Command(GitCommand.Commit)
    async commit(args: string[] = []) {
        return await this.runGit({}, ...['commit', ...args]);
    }

    @Command(GitCommand.Remote)
    async remote(args: string[] = []) {
        return await this.runGit({}, ...['remote', ...args]);
    }

    @Command(GitCommand.Status)
    async status(args: string[] = []) {
        return await this.runGit({}, ...['status', ...args]);
    }

    @Command(GitCommand.Pull)
    async pull(args: string[] = []) {
        return await this.runGit({}, ...['pull', ...args]);
    }

    @Command(GitCommand.Push)
    async push(args: string[] = []) {
        return await this.runGit({}, ...['push', ...args]);
    }

    @Command(GitCommand.Fetch)
    fetch() {
        // todo
    }

    async getGitConfig() {
        let config: string = await this.config(['--list']);
        let configMap: any = {};
        config.split("\n").forEach((item: string) => {
            if (item) {
                let _item = item.split('=');
                let k = _item[0];
                let v = _item[1];
                configMap[k] = v;
            }
        });
        return Promise.resolve(configMap);
    }

    @Command(GitCommand.Config)
    async config(args: string[] = []) {
        return await this.runGit({}, ...['config', ...args]);
    }

    @Command(GitCommand.Log)
    async log(args: string[] = []) {
        return await this.runGit({}, ...['log', ...args]);
    }

    checkGitEnable(): void | Promise<any> {
        if (!Git.enable || Git.gitInfo.path === "") {
            GitMsg.showGitUnableMessage();
            return Promise.resolve(false);
        } else {
            return Promise.resolve(true);
        }
    }
    setRepopath(repoPath: string) {
        Git.repoPath = repoPath;
    }
    isGitEnable() {
        return Git.enable;
    }
    async checkGitUser(command: string): Promise<any> {
        let is = gitUserCheckMap.has(command);
        if (is) {
            Git.gitInfo.config = await this.getGitConfig();
            if (!Git.gitInfo.config['user.email']) {
                return Promise.resolve(false);
            } else {
                return Promise.resolve(true);
            }
        } else {
            return Promise.resolve(true);
        }
    }

    async runGit(options?: RunOptions | undefined, ...args: any[]): Promise<any> {
        options = Object.assign({ cwd: Git.repoPath }, options) as RunOptions;
        if (await this.checkGitEnable()) {
            if (await this.checkGitUser(args[0])) {
                args.splice(0, 0, '-c', 'core.quotepath=false', '-c', 'color.ui=false');
                return run(Git.gitInfo.path, args, options);
            } else {
                return { noGitUser: true };
            }
        }
    }
}

class GitMsg {
    static unableGitMessage: string = 'Git is not available, please ensure that git is installed correctly';
    static unknowUserMessage: string = 'Please tell me who you areï¼Œwe need you to set your email';
    static undefinedEmailMessage: string = 'Email is undefined or name is undefined';

    static showGitUnableMessage(message = GitMsg.unableGitMessage) {
        window.showWarningMessage(message);
    }

    static showUnknowGitUserMessage(message = GitMsg.unknowUserMessage) {
        window.showWarningMessage(message);
    }

    static showUndefinedEmailMessage(message = GitMsg.undefinedEmailMessage) {
        window.showWarningMessage(message);
    }
}

let gitInst = new Git();
export default gitInst;