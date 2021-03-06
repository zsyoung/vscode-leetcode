"use strict";

import * as fse from "fs-extra";
import * as vscode from "vscode";
import { leetCodeManager } from "../leetCodeManager";
import { IQuickItemEx, leetCodeBinaryPath, UserStatus } from "../shared";
import { executeCommandWithProgress } from "../utils/cpUtils";
import { DialogType, promptForOpenOutputChannel, showFileSelectDialog, showResultFile } from "../utils/uiUtils";
import { getActivefilePath } from "../utils/workspaceUtils";

export async function testSolution(channel: vscode.OutputChannel, uri?: vscode.Uri): Promise<void> {
    try {
        if (leetCodeManager.getStatus() === UserStatus.SignedOut) {
            return;
        }

        const filePath: string | undefined = await getActivefilePath(uri);
        if (!filePath) {
            return;
        }
        const picks: Array<IQuickItemEx<string>> = [];
        picks.push(
            {
                label: "$(three-bars) Default test cases",
                description: "",
                detail: "Test with the default cases",
                value: ":default",
            },
            {
                label: "$(pencil) Write directly...",
                description: "",
                detail: "Write test cases in input box",
                value: ":direct",
            },
            {
                label: "$(file-text) Browse...",
                description: "",
                detail: "Test with the writen cases in file",
                value: ":file",
            },
        );
        const choice: IQuickItemEx<string> | undefined = await vscode.window.showQuickPick(picks);
        if (!choice) {
            return;
        }

        let result: string | undefined;
        switch (choice.value) {
            case ":default":
                result = await executeCommandWithProgress("Submitting to LeetCode...", channel, "node", [leetCodeBinaryPath, "test", `"${filePath}"`]);
                break;
            case ":direct":
                const testString: string | undefined = await vscode.window.showInputBox({
                    prompt: "Enter the test cases.",
                    validateInput: (s: string) => s && s.trim() ? undefined : "Test case must not be empty.",
                    placeHolder: "Example: [1,2,3]\\n4",
                    ignoreFocusOut: true,
                });
                if (testString) {
                    result = await executeCommandWithProgress("Submitting to LeetCode...", channel, "node", [leetCodeBinaryPath, "test", `"${filePath}"`, "-t", `"${testString.replace(/"/g, "")}"`]);
                }
                break;
            case ":file":
                const testFile: vscode.Uri[] | undefined = await showFileSelectDialog();
                if (testFile && testFile.length) {
                    const input: string = await fse.readFile(testFile[0].fsPath, "utf-8");
                    if (input.trim()) {
                        result = await executeCommandWithProgress("Submitting to LeetCode...", channel, "node", [leetCodeBinaryPath, "test", `"${filePath}"`, "-t", `"${input.replace(/"/g, "").replace(/\r?\n/g, "\\n")}"`]);
                    } else {
                        vscode.window.showErrorMessage("The selected test file must not be empty.");
                    }
                }
                break;
            default:
                break;
        }
        if (!result) {
            return;
        }
        await showResultFile(result);
    } catch (error) {
        await promptForOpenOutputChannel("Failed to test the solution. Please open the output channel for details.", DialogType.error, channel);
    }
}
