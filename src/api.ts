import * as vscode from 'vscode';
import * as request from 'request-promise';

const base = "https://aistudio.baidu.com";

export class Api {
    constructor(private context: vscode.ExtensionContext) {
    }

    public get cookie() {
        return this.context.globalState.get("cookie") || "";
    }

    public set cookie(cookie: string) {
        this.context.globalState.update("cookie", cookie);
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
