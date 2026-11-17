import { type ParseInput, parseTimelineJson } from "./parse";
import type { ParsedHistory } from "./types";

export type ParseProgress =
	| { phase: "reading"; name: string; index: number; total: number }
	| { phase: "building" };

type WorkerMessage =
	| ({ type: "progress" } & ParseProgress)
	| { type: "done"; history: ParsedHistory }
	| { type: "error"; message: string };

function abortError(): Error {
	const error = new Error("The import was cancelled.");
	error.name = "AbortError";
	return error;
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw abortError();
}

async function parseInline(
	files: File[],
	onProgress?: (progress: ParseProgress) => void,
	signal?: AbortSignal,
): Promise<ParsedHistory> {
	const inputs: ParseInput[] = [];
	for (let index = 0; index < files.length; index += 1) {
		throwIfAborted(signal);
		const file = files[index];
		onProgress?.({
			phase: "reading",
			name: file.name,
			index: index + 1,
			total: files.length,
		});
		inputs.push({ name: file.name, bytes: file.size, text: await file.text() });
	}
	throwIfAborted(signal);
	onProgress?.({ phase: "building" });
	throwIfAborted(signal);
	return parseTimelineJson(inputs);
}

/**
 * Reads and parses files in a Web Worker so a multi-hundred-megabyte export
 * does not freeze the page. Falls back to the main thread when workers are
 * unavailable. The optional signal terminates the worker and rejects with an
 * `AbortError`, so leaving the importing state cannot leak a stale result.
 */
export function parseTimelineFiles(
	files: File[],
	onProgress?: (progress: ParseProgress) => void,
	signal?: AbortSignal,
): Promise<ParsedHistory> {
	if (signal?.aborted) return Promise.reject(abortError());

	if (typeof Worker === "undefined") {
		return parseInline(files, onProgress, signal);
	}

	return new Promise((resolve, reject) => {
		let worker: Worker;
		let settled = false;
		const cleanup = () => {
			settled = true;
			signal?.removeEventListener("abort", onAbort);
			worker.terminate();
		};
		const finish = () => cleanup();

		const onAbort = () => {
			if (settled) return;
			cleanup();
			reject(abortError());
		};

		try {
			worker = new Worker(new URL("./worker.ts", import.meta.url), {
				type: "module",
			});
		} catch {
			parseInline(files, onProgress, signal).then(resolve, reject);
			return;
		}

		signal?.addEventListener("abort", onAbort, { once: true });

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

		try {
			worker.postMessage({ files });
		} catch (error) {
			finish();
			reject(error);
		}
	});
}
