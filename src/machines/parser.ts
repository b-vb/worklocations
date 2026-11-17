import { createCallbackLogic } from "xstate";
import { type ParseProgress, parseTimelineFiles } from "../lib/timeline/load";
import type { ParsedHistory } from "../lib/timeline/types";

export type ParserEvent =
	| { type: "parser.progress"; progress: ParseProgress }
	| { type: "parser.done"; history: ParsedHistory }
	| { type: "parser.aborted" }
	| { type: "parser.error"; error: string };

export type ParserInput = { files: File[] };

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}

/**
 * Callback actor around the parse worker. The cleanup function is XState's
 * cancellation hook: leaving the importing state aborts the request and
 * terminates the worker.
 */
export const parserLogic = createCallbackLogic<ParserEvent, ParserInput>({
	run: ({ input, sendBack }) => {
		const controller = new AbortController();
		let active = true;

		parseTimelineFiles(
			input.files,
			(progress) => {
				if (active) sendBack({ type: "parser.progress", progress });
			},
			controller.signal,
		)
			.then((history) => {
				if (active) sendBack({ type: "parser.done", history });
			})
			.catch((error: unknown) => {
				if (!active) return;
				if (isAbortError(error)) {
					sendBack({ type: "parser.aborted" });
					return;
				}
				sendBack({
					type: "parser.error",
					error: error instanceof Error ? error.message : String(error),
				});
			});

		return () => {
			active = false;
			controller.abort();
		};
	},
});
