import { parseTimelineJson } from "./parse";
import { readFiles } from "./readFiles";

type Incoming = { files: File[] };

type Outgoing =
	| {
			type: "progress";
			phase: "reading" | "building";
			name?: string;
			index?: number;
			total?: number;
	  }
	| { type: "done"; history: ReturnType<typeof parseTimelineJson> }
	| { type: "error"; message: string };

const scope = self as unknown as {
	postMessage: (message: Outgoing) => void;
	onmessage: ((event: MessageEvent<Incoming>) => void) | null;
};

const post = (message: Outgoing) => scope.postMessage(message);

scope.onmessage = async (event) => {
	try {
		const files = event.data?.files ?? [];
		const inputs = await readFiles(files, (progress) =>
			post({ type: "progress", ...progress }),
		);

		post({ type: "progress", phase: "building" });
		post({ type: "done", history: parseTimelineJson(inputs) });
	} catch (error) {
		post({
			type: "error",
			message:
				error instanceof Error ? error.message : "Could not read the file.",
		});
	}
};
