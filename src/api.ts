import * as vscode from 'vscode';
import * as request from 'request-promise';
import * as path from 'path';
import { isString } from 'util';

const base = "https://aistudio.baidu.com";

export class Api {
    constructor(private context: vscode.ExtensionContext) {
    }

    public get cookie() {
        return this.context.globalState.get("cookie") || "";
    }

    /**
     * 获取公开数据集
     */
    async dataset_publiclist() {
        return await request.get(`${base}/studio/dataset/publiclist`, {
            headers: {
                cookie: this.cookie
            }
        });
    }

    /**
     * 获取个人数据集
     */
    async dataset_userlist() {
        return await request.get(`${base}/studio/dataset/userlist`, {
            headers: {
                cookie: this.cookie
            }
        });
    }

    /**
     * 获取个人数据集
     */
    async project_self_list() {
        return await request.post(`${base}/studio/project/self/list`, {
            headers: {
                cookie: this.cookie
            },
            json: { "p": 1, "pageSize": 10, "personalProjectRange": 0, "category": 0, "selfOrder": 1, "kw": "" }
        });
    }

    /**
     * 获取项目数据
    */
    async project_projectdata() {
        return await request.get(`${base}/studio/project/projectdata`, {
            headers: {
                cookie: this.cookie
            }
        });
    }

    /**
     * 创建项目
    */
    async project_add(info: ProjectInfo) {
        let form = `projectName=${info.projectName}&projectAbs=${info.projectAbs}&shared=${!info.selfProject}&projectEnvironment=${info.projectEnvironment}&projectFramework=${info.projectFramework}&resourceAlloc=${info.resourceAlloc}&templateId=${info.templateId}`;
        form += `&projectDataset=` + info.projectDataset.join(",");
        form += `&tags=` + info.tags.join(",");

        return await request.get(`${base}/studio/project/add`, {
            headers: {
                cookie: this.cookie
            },
            form: form
            // form: "projectName=test3&projectAbs=test3&shared=false&projectDataset=&projectEnvironment=2&projectFramework=9&resourceAlloc=0&templateId=-1&tags=12"
        });
    }

    /**
     * 删除项目
    */
    async project_delete(projectId: string) {
        return await request.get(`${base}/studio/project/delete`, {
            headers: {
                cookie: this.cookie
            },
            form: "projectId=" + projectId
        });
    }
}

export class ProjectDataProvider implements vscode.TreeDataProvider<ProjectInfo> {
    public projects: ProjectInfo[] = [];

    constructor(private context: vscode.ExtensionContext) { }

    public get cookie() { return this.context.globalState.get("cookie") || ""; }

    public didChangeTreeDataEmitter = new vscode.EventEmitter<ProjectInfo>();
    public onDidChangeTreeData = this.didChangeTreeDataEmitter.event;

    getTreeItem(element: ProjectInfo): vscode.TreeItem {
        let item: vscode.TreeItem = {
            id: "" + element.projectId,
            label: element.projectName,
            tooltip: element.projectAbs,
            contextValue: element.running ? "running" : "stop"
        };

        if (element.running) {
            item.iconPath = this.context.asAbsolutePath(path.join('img', 'running.svg'));
        }
        return item;
    }

    async getChildren(element?: ProjectInfo | undefined): Promise<ProjectInfo[]> {
        if (element) return [];

        if (this.projects.length === 0) await this.loadData();
        return this.projects;
    }

    async loadData() {
        let result: any = await request.post(`${base}/studio/project/self/list`, {
            headers: {
                cookie: this.cookie
            },
            json: { "p": 1, "pageSize": 10, "personalProjectRange": 0, "category": 0, "selfOrder": 1, "kw": "" }
        });

        if (result.errorCode !== 0) {
            vscode.window.showErrorMessage("获取项目列表失败，请检查Cookie是否正确？");
            return;
        }

        this.projects = <ProjectInfo[]>result.result.data;
    }

    async runProject(element?: ProjectInfo | undefined) {
        if (!element) {
            await vscode.window.showErrorMessage("运行项目失败：不能为空！");
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在启动项目...",
            cancellable: false
        }, async (progress, token) => {
            for (let i = 0; i < 10; i++) {
                try {
                    progress.report({ increment: i * 10 });
                    let result: any = await request.post(`${base}/studio/project/running`, {
                        headers: {
                            cookie: this.cookie
                        },
                        form: `projectId=${element.projectId}&versionId=0&clusterNum=0&scheduleName=normalSchedule`
                    });

                    if (isString(result)) result = JSON.parse(result);
                    if (result.result.code === 200) {
                        for (let item of this.projects) {
                            if (item.projectId === element.projectId) {
                                item.running = true;
                                break;
                            }
                        }

                        progress.report({ increment: 100 });
                        this.didChangeTreeDataEmitter.fire();
                        return;
                    }
                } catch (e) {
                    console.log(e);
                }

                const sleep = require('sleep-async')().Promise;
                await sleep.sleep(3000);
            }
        });
    }

    async stopProject(element?: ProjectInfo | undefined) {
        if (!element) {
            await vscode.window.showErrorMessage("运行项目失败：不能为空！");
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在停止项目...",
            cancellable: false
        }, async (progress, token) => {
            for (let i = 0; i < 10; i++) {
                try {
                    progress.report({ increment: i * 10 });
                    let result: any = await request.post(`${base}/studio/project/stop`, {
                        headers: {
                            cookie: this.cookie
                        },
                        form: `projectId=${element.projectId}`
                    });

                    if (isString(result)) result = JSON.parse(result);
                    if (result.result.code === 200) {
                        for (let item of this.projects) {
                            if (item.projectId === element.projectId) {
                                item.running = false;
                                break;
                            }
                        }

                        progress.report({ increment: 100 });
                        this.didChangeTreeDataEmitter.fire();
                        return;
                    }
                } catch (e) {
                    console.log(e);
                }

                const sleep = require('sleep-async')().Promise;
                await sleep.sleep(3000);
            }
        });
    }

    async refreshProject() {
        await this.loadData();
        this.didChangeTreeDataEmitter.fire();
    }
}

/**
 * 项目信息
*/
export interface ProjectInfo {
    projectId: number;
    projectName: string;
    projectAbs: string;
    projectType: number;
    projectDataset: any[];
    projectEnvironment: number;
    projectFramework: number;
    projectEnvText: null;
    projectFraText: null;
    pythonVersion: string;
    userId: number;
    createTime: string;
    updateTime: string;
    createTimeStamp: number;
    fork: boolean;
    collect: boolean;
    projectFileId: null;
    statusCode: number;
    forkCount: number;
    collectCount: number;
    commentCount: number;
    projectWeight: number;
    resourceAlloc: number;
    userName: string;
    nickname: string;
    templateId: number;
    running: boolean;
    deviceType: number;
    orgGroupName: null;
    graphRunningSubmitId: number;
    portrait: null;
    versionId: null;
    viewCount: number;
    rankDate: null;
    topicTags: null;
    initStatus: number;
    projectState: number;
    tags: number[];
    selfProject: boolean;
}
