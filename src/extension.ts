import * as vscode from 'vscode';
import { upDevpod, listDevpods } from './devpod/commands';
import { devpodBinExists, installDevpod } from './devpod/bin';
import { installCodeServer } from './vscodium/server';
import * as path from 'path';
import { DevpodTreeView } from './treeView';
import { parseCustomizations } from './spec';
import { downloadExtension, DOWNLOAD_EXTENSIONS_DIR } from './marketplace';

// TODO: not fail when open vsx in not available
// TODO: check devpod binary
// TODO: check podman and add podman provider

export async function activate(context: vscode.ExtensionContext) {
	const recreate = true;

	initial();

	context.subscriptions.push(vscode.commands.registerCommand(
		'vscodium-devpodcontainers.open',
		() => openContainer(),
	));
	context.subscriptions.push(vscode.commands.registerCommand(
		'vscodium-devpodcontainers.recreateAndOpen',
		() => openContainer(recreate),
	));

	const devpodsTreeView = new DevpodTreeView();
	vscode.window.registerTreeDataProvider('devpodcontainers.devpods', devpodsTreeView);
	vscode.commands.registerCommand('vscodium-devpodcontainers.refreshEntry', () => devpodsTreeView.refresh());
}

async function initial() {
	const containerFiles = await vscode.workspace.findFiles(".devcontainer/**/devcontainer.json");
	if (containerFiles.length === 0) {
		return;
	}

	const reopen = { title: 'Open Workspace in Container' };
	// const neverAgain = { title: "Don't Show Again" };
	const notNow = { title: "Not Right Now" };
	const action = await vscode.window.showInformationMessage(
		'A devcontainer.json file was found. Would you like to open this workspace in a container?',
		reopen,
		notNow,
	);
	switch (action) {
		case reopen: {
			openContainer();
			break;
		}

		case notNow: {
			vscode.window.showInformationMessage("Sorry, but that button is not yet implemented :)");
			break;
		}

		// TODO: implement 'Never Again' button
		// 	case neverAgain:
		// 		vscode.window.showInformationMessage("Sorry, but that button is not yet implemented :)");
		// 		break;
		// }
	}
}

async function openContainer(recreate: boolean = false) {
	// the devontainer file(s) present in our workspace folder
	const containerFiles = await vscode.workspace.findFiles(".devcontainer/**/devcontainer.json");
	if (containerFiles.length === 0) {
		vscode.window.showErrorMessage('No devcontainer files found.');
		return;
	}
	if (!devpodBinExists()) {
		await installDevpod();
		// TODO: delete the return once installDevpod is implemented
		return;
	}

	// the uri of the currently opened editor tab
	const opened = vscode.window.activeTextEditor?.document?.uri;
	// the uri of the current workspace
	const workspace = opened ?
		vscode.workspace.getWorkspaceFolder(opened) :
		vscode.workspace.workspaceFolders?.at(0);

	// exit if no workspace could be resolved
	if (!workspace) {
		vscode.window.showInformationMessage('No workspace found.');
		return;
	}

	// i assume this is to resolve the potential existience of multiple workspace folders????
	const picks = new Map<string, vscode.Uri>([]);
	containerFiles.forEach(uri => {
		// ig this gets the relative path to the workspace folder
		const short = uri.path.replace(workspace.uri.path, '');
		picks.set(short, uri);
	});

	let pick: vscode.Uri | undefined;
	let pickKey: string | undefined;
	if (picks.size === 1) {
		pickKey = [...picks.keys()][0];
		// grab the singular workspace folder's uri
		pick = [...picks.values()][0];
	}
	if (picks.size > 1) {
		// prompt user about which devcontainer workspace they'd like to open
		pick = await vscode.window.showQuickPick([...picks.keys()]).then(chosen => {
			if (!chosen) {
				return;
			}
			pickKey = chosen;
			return picks.get(chosen);
		});
	}
	// cancel if no workspace was selected
	if (!pick || !pickKey) {
		return;
	}

	let { stdoutChannel } = await upDevpod({
		configPath: pickKey, // pick.path.replace(workspace.uri.path, ''),
		workspaceFolder: workspace.uri.path,
		resetRecreate: recreate ? "recreate" : undefined,
	});

	const devpods = await listDevpods();
	// TODO: more then one devpod in the directory.
	const devpod = devpods.find((d) => d.source.localFolder === workspace.uri.path);
	if (!devpod) {
		vscode.window.showErrorMessage('Unknown error: no devpod found');
		return;
	}
	const devpodHost = `${devpod.id}.devpod`;

	const customizations = parseCustomizations(pick.path);
	const exts = customizations.extensions;
	const installExtArgs = [];
	const registryExts = [];
	for (const ext of exts) {
		// No registry specified, so let vscodium server handle it by
		// providing extension ID.
		if (!ext.registry) {
			installExtArgs.push(ext.id);
		} else {
			installExtArgs.push(path.join(DOWNLOAD_EXTENSIONS_DIR, `${ext.id}.vsix`));
			registryExts.push({
				id: ext.id,
				version: ext.version,
				registryUrl: customizations.registries[ext.registry].url,
				registryHeaders: customizations.registries[ext.registry].headers,
			});
		}
	}
	await Promise.allSettled(registryExts.map((ext) => downloadExtension({
		devpodHost: devpodHost,
		extId: ext.id,
		extVersion: ext.version,
		registryUrl: ext.registryUrl,
		registryHeaders: ext.registryHeaders,
	})));

	// Unfortunately, we have to inject the codium server outselves because
	// DevPod does not support it (yet).
	// 
	// TODO: show message to users or log the script's output into the output channel
	stdoutChannel.appendLine("attempting to inject the codium remote server");
	await installCodeServer(devpodHost, installExtArgs);


	const devpodWorkspaceUri = vscode.Uri.from({
		scheme: 'vscode-remote',
		authority: `ssh-remote+${devpodHost}`,
		path: `/workspaces/${devpod.id}`,
	});
	vscode.commands.executeCommand('vscode.openFolder', devpodWorkspaceUri);
}

export function deactivate() { }