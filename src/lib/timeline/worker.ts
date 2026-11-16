import { type ParseInput, parseTimelineJson } from "./parse";

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
		const inputs: ParseInput[] = [];

		for (let index = 0; index < files.length; index += 1) {
			const file = files[index];
			post({
				type: "progress",
				phase: "reading",
				name: file.name,
				index: index + 1,
				total: files.length,
			});
			const text = await file.text();
			inputs.push({ name: file.name, bytes: file.size, text });
		}

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
