import { useRef, useState } from "react";
import { Badge, Button, Card, cn, SectionHeader } from "./ui";

type Props = {
	onFiles: (files: File[]) => void;
	onDemo: () => void;
	busy: boolean;
	progress: string | null;
	error: string | null;
	hasHistory: boolean;
};

export function DropZone({
	onFiles,
	onDemo,
	busy,
	progress,
	error,
	hasHistory,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	const handleFiles = (list: FileList | null) => {
		if (!list || list.length === 0) return;
		onFiles(Array.from(list));
	};

	return (
		<Card>
			<SectionHeader
				step={hasHistory ? undefined : "1"}
				title={
					hasHistory ? "Location history" : "Open your Google Timeline export"
				}
				description={
					hasHistory
						? "Drop another export to replace or extend what is loaded."
						: "The file is read in your browser only. Nothing is uploaded, and no location data ever leaves this device."
				}
				action={
					<Badge tone="ok">
						<span className="size-1.5 rounded-full bg-emerald-500" />
						100% local
					</Badge>
				}
			/>

			<div className="p-5">
				<button
					type="button"
					disabled={busy}
					onDragOver={(event) => {
						event.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(event) => {
						event.preventDefault();
						setDragging(false);
						handleFiles(event.dataTransfer.files);
					}}
					onClick={() => inputRef.current?.click()}
					className={cn(
						"group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
						dragging
							? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800/60"
							: "border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/40",
						busy && "cursor-wait opacity-70",
					)}
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						className="size-8 text-slate-400 dark:text-slate-500"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
						/>
					</svg>
					<span className="text-sm font-medium text-slate-800 dark:text-slate-200">
						{busy ? "Reading…" : "Drop Timeline.json here, or click to choose"}
					</span>
					<span className="max-w-md text-xs text-slate-500 dark:text-slate-400">
						Android <code className="font-mono">Timeline.json</code>, iPhone{" "}
						<code className="font-mono">location-history.json</code>, or an old
						Takeout export. Several files at once are fine.
					</span>
				</button>

				<input
					ref={inputRef}
					type="file"
					accept=".json,application/json"
					multiple
					className="hidden"
					onChange={(event) => {
						handleFiles(event.target.files);
						event.target.value = "";
					}}
				/>

				{busy && progress ? (
					<div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
						<span className="size-2 animate-pulse rounded-full bg-indigo-500" />
						{progress}
					</div>
				) : null}

				{error ? (
					<p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25">
						{error}
					</p>
				) : null}

				<div className="mt-5 flex flex-wrap items-center gap-2">
					<Button variant="ghost" size="sm" onClick={onDemo} disabled={busy}>
						Load demo data instead
					</Button>
					<span className="text-xs text-slate-400 dark:text-slate-500">
						Six months of made-up history, so you can try the flow right now.
					</span>
				</div>

				<details className="mt-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
					<summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-200">
						Where do I get the file?
					</summary>
					<div className="mt-3 space-y-3 text-slate-600 dark:text-slate-300">
						<div>
							<p className="font-medium text-slate-700 dark:text-slate-200">
								Android (Google Maps app)
							</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Tap your profile picture → Settings → Location &amp; Privacy →
								Export Timeline data. Rename the downloaded file to{" "}
								<code className="font-mono">Timeline.json</code> if the
								extension is missing.
							</p>
						</div>
						<div>
							<p className="font-medium text-slate-700 dark:text-slate-200">
								iPhone (Google Maps app)
							</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Profile picture → Settings → Location &amp; Privacy → Export
								Timeline data. The file is called{" "}
								<code className="font-mono">location-history.json</code>.
							</p>
						</div>
						<div>
							<p className="font-medium text-slate-700 dark:text-slate-200">
								Older history from Takeout
							</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Google Takeout → Location History (JSON). Extract the zip and
								select the monthly{" "}
								<code className="font-mono">Semantic Location History</code>{" "}
								files, or the big{" "}
								<code className="font-mono">Records.json</code>.
							</p>
						</div>
					</div>
				</details>
			</div>
		</Card>
	);
}
