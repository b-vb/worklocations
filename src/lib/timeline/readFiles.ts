import type { ParseInput } from "./parse";
import type { ParseProgress } from "./progress";

/**
 * Reads each file into text, reporting per-file progress. Shared by the worker
 * and the main-thread fallback so their progress semantics cannot drift.
 */
export async function readFiles(
	files: File[],
	onProgress?: (progress: Extract<ParseProgress, { phase: "reading" }>) => void,
	signal?: AbortSignal,
): Promise<ParseInput[]> {
	const inputs: ParseInput[] = [];
	for (let index = 0; index < files.length; index += 1) {
		if (signal?.aborted) {
			const error = new Error("The import was cancelled.");
			error.name = "AbortError";
			throw error;
		}
		const file = files[index];
		onProgress?.({
			phase: "reading",
			name: file.name,
			index: index + 1,
			total: files.length,
		});
		inputs.push({ name: file.name, bytes: file.size, text: await file.text() });
	}
	return inputs;
}
