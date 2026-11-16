import { type ParseInput, parseTimelineJson } from "./parse";
import type { ParsedHistory } from "./types";

export type ParseProgress =
	| { phase: "reading"; name: string; index: number; total: number }
	| { phase: "building" };

type WorkerMessage =
	| ({ type: "progress" } & ParseProgress)
	| { type: "done"; history: ParsedHistory }
	| { type: "error"; message: string };

async function parseInline(
	files: File[],
	onProgress?: (progress: ParseProgress) => void,
): Promise<ParsedHistory> {
	const inputs: ParseInput[] = [];
	for (let index = 0; index < files.length; index += 1) {
		const file = files[index];
		onProgress?.({
			phase: "reading",
			name: file.name,
			index: index + 1,
			total: files.length,
		});
		inputs.push({ name: file.name, bytes: file.size, text: await file.text() });
	}
	onProgress?.({ phase: "building" });
	return parseTimelineJson(inputs);
}

/**
 * Reads and parses files in a Web Worker so a multi-hundred-megabyte export
 * does not freeze the page. Falls back to the main thread when workers are
 * unavailable.
 */
export function parseTimelineFiles(
	files: File[],
	onProgress?: (progress: ParseProgress) => void,
): Promise<ParsedHistory> {
	if (typeof Worker === "undefined") {
		return parseInline(files, onProgress);
	}

	return new Promise((resolve, reject) => {
		let worker: Worker;
		try {
			worker = new Worker(new URL("./worker.ts", import.meta.url), {
				type: "module",
			});
		} catch {
			parseInline(files, onProgress).then(resolve, reject);
			return;
		}

		const finish = () => worker.terminate();

		worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
			const data = event.data;
			if (data.type === "progress") {
				if (data.phase === "reading") {
					onProgress?.({
						phase: "reading",
						name: data.name ?? "Timeline.json",
						index: data.index ?? 1,
						total: data.total ?? files.length,
					});
				} else {
					onProgress?.({ phase: "building" });
				}
			}
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
