import vscode from 'vscode';
import path from 'path';
import fs from 'fs';

export async function installDevpod() {
	const install = { title: 'Yes' };
	const decline = { title: 'No' };
	const explain = { title: "What is DevPod?" };
	const answer = await vscode.window.showInformationMessage(
		'DevPod couldn\'t be found on your machine, would you like to install it now?',
		install,
		decline,
		explain,
	);

	switch (answer) {
		case install: {
			vscode.window.showErrorMessage('Sorry, but this function is not yet implemented.\nPlease install devpod manually. Instuctions can be found here: https://devpod.sh/docs/getting-started/install');
			break;
		}

		case explain: {
			const msg = `
			The DevPod Containers extension uses DevPod for bootstraping devcontainers.
			DevPod implements the devcontainers specification, automatically configures SSH access, and lots more. Without it this extension wouldn't be possible.
			It is free software created by Loft Labs, which source code can be found here: https://github.com/loft-sh/devpod
			`;
			vscode.window.showInformationMessage(msg);
			break;
		}

		case (decline): {
			const msg = "Gotcha, but please note that this extension can't function without the DevPod tool.";
			vscode.window.showInformationMessage(msg);
			break;
		}
	}
}

export function devpodBinExists(): boolean {
	const envPath = process.env['PATH'] || '';
	const paths = envPath?.split(path.delimiter);
	let s = '';
	for (const p of paths) {
		const binpath = path.join(p, 'devpod');
		if (executableFileExists(binpath)) {
			return true;
		}
	}
	return false;
}

function executableFileExists(filePath: string): boolean {
	let exists = true;
	try {
		exists = fs.statSync(filePath).isFile();
		if (exists) {
			fs.accessSync(filePath, fs.constants.F_OK | fs.constants.X_OK);
		}
	} catch (e) {
		exists = false;
	}
	return exists;
}