import * as vscode from "vscode";
import { spawn } from "child_process";

export async function upDevpod(args: {
	configPath: string;
	workspaceFolder: string;
	provider?: string;
	resetRecreate?: "recreate" | "reset";
}): Promise<{ stdoutChannel: vscode.OutputChannel }> {
	// create "context" output tab to show setup progress
	const cliOutput = vscode.window.createOutputChannel("devpod up");
	cliOutput.show();
	return new Promise<{ stdoutChannel: vscode.OutputChannel }>((resolve, reject) => {
		const cmdArgs = [
			"up",
			"--devcontainer-path",
			args.configPath,
			"--log-output",
			"raw",
			"--ide",
			"none",
			args.workspaceFolder,
		];

		// add provider args if present
		if (args.provider) {
			cmdArgs.unshift("--provider", args.provider);
		}

		// define container rebuild args if present
		switch (args.resetRecreate) {
			case "recreate":
				cmdArgs.push("--recreate");

			case "reset":
				cmdArgs.push("--reset");

			default:
				break;
		}

		// launch
		const cp = spawn("devpod", cmdArgs);
		cp.stdout.on("data", (data) => {
			cliOutput.append(data.toString());
		});
		cp.stderr.on("data", (data) => {
			cliOutput.append(data.toString());
		});
		cp.on("close", (code) => {
			if (code !== 0) {
				vscode.window.showErrorMessage("Failed to build the devpod.");
				return reject("Failed to build the devpod.");
			}

			return resolve({ stdoutChannel: cliOutput });
		});
	});
}

type Devpod = {
	id: string;
	source: {
		localFolder: string;
	};
	provider: {
		name: string;
	};
};

// get existing devpods
export async function listDevpods() {
	return new Promise<Devpod[]>((resolve, reject) => {
		const cp = spawn("devpod", ["list", "--output", "json"]);
		let stdout = "";
		cp.stdout.on("data", (data) => {
			stdout += data;
		});
		cp.on("close", (code) => {
			if (code !== 0) {
				vscode.window.showErrorMessage("Failed to get available devpods.");
				return reject("Failed to get available devpods.");
			}

			return resolve(JSON.parse(stdout) as Devpod[]);
		});
	});
}

// a subset of the provider info returned by `devpod provider list --output json
interface DevpodProvider {
	// [pname: string]: {
	config: {
		name: string,
		version: string,
		icon: string,
		home: string,
		source: {
			internal: boolean,
			raw: string
		},
		description: string
		// }
	};
}

// a specific instance/block of provider info
// this will change, it is limited for now but in future i'll update it to parse all providers
type DevpodProviderTree = Record<"docker" | "ssh", DevpodProvider>

// an iterative type covering all blocks in the main ProviderTree (json block returned by the devpod cli)
// type DevpodProviderTree = {
// 	[Prop in keyof ProviderTreeBlock]: DevpodProvider;
// };

// get available providers
export async function listProviders() {
	return new Promise<{ kind: string, provider: DevpodProvider }[]>((resolve, reject) => {
		const cp = spawn("devpod", ["provider", "list", "--output", "json"]);
		let stdout = "";
		cp.stdout.on("data", (data) => {
			stdout += data;
		});
		cp.on("close", (code) => {
			if (code !== 0) {
				vscode.window.showErrorMessage("Failed to get available providers.");
				return reject("Failed to get available providers.");
			}

			let stdoutJSON = JSON.parse(stdout) as DevpodProviderTree;
			let jsonChildren = Object.entries(stdoutJSON).map(i => {
				return { kind: i[0], provider: i[1] }
			}); // stdoutJSON as DevpodProvider[];

			return resolve(jsonChildren);
		});
	});
}

