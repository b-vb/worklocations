import { type ParseInput, parseTimelineJson } from "./parse";

type Incoming = { files: File[] };

type Outgoing =
	| { type: "progress"; message: string }
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
				message: `Reading ${file.name} (${index + 1}/${files.length})…`,
			});
			const text = await file.text();
			inputs.push({ name: file.name, bytes: file.size, text });
		}

		post({ type: "progress", message: "Building your day-by-day timeline…" });
		post({ type: "done", history: parseTimelineJson(inputs) });
	} catch (error) {
		post({
			type: "error",
			message:
				error instanceof Error ? error.message : "Could not read the file.",
		});
	}
};
