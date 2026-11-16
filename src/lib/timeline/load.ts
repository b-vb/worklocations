import { type ParseInput, parseTimelineJson } from "./parse";
import type { ParsedHistory } from "./types";

type WorkerMessage =
	| { type: "progress"; message: string }
	| { type: "done"; history: ParsedHistory }
	| { type: "error"; message: string };

async function parseInline(files: File[]): Promise<ParsedHistory> {
	const inputs: ParseInput[] = [];
	for (const file of files) {
		inputs.push({ name: file.name, bytes: file.size, text: await file.text() });
	}
	return parseTimelineJson(inputs);
}

/**
 * Reads and parses files in a Web Worker so a multi-hundred-megabyte export
 * does not freeze the page. Falls back to the main thread when workers are
 * unavailable.
 */
export function parseTimelineFiles(
	files: File[],
	onProgress?: (message: string) => void,
): Promise<ParsedHistory> {
	if (typeof Worker === "undefined") {
		onProgress?.("Reading files…");
		return parseInline(files);
	}

	return new Promise((resolve, reject) => {
		let worker: Worker;
		try {
			worker = new Worker(new URL("./worker.ts", import.meta.url), {
				type: "module",
			});
		} catch {
			parseInline(files).then(resolve, reject);
			return;
		}

		const finish = () => worker.terminate();

		worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
			const data = event.data;
			if (data.type === "progress") onProgress?.(data.message);
			if (data.type === "done") {
				finish();
				resolve(data.history);
			}
			if (data.type === "error") {
				finish();
				reject(new Error(data.message));
			}
		};

		worker.onerror = (event) => {
			finish();
			reject(new Error(event.message || "Could not read the file."));
		};

		worker.postMessage({ files });
	});
}
