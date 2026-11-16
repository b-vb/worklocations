import { useEffect, useState } from "react";
import { Button, Card } from "./ui";

type LocalFile = { name: string; size: number };

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Dev-only shortcut: files placed in ./data are served by a tiny Vite
 * middleware, so you do not have to re-pick the export on every reload.
 */
export function LocalDataPanel({
	onFile,
	disabled,
}: {
	onFile: (file: File) => void;
	disabled: boolean;
}) {
	const [files, setFiles] = useState<LocalFile[]>([]);
	const [loading, setLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch("/__local-data")
			.then((response) => response.json())
			.then((payload: { files?: LocalFile[] }) => {
				if (!cancelled) setFiles(payload.files ?? []);
			})
			.catch(() => {
				// The middleware only exists while `vite dev` runs.
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (files.length === 0) return null;

	const load = async (name: string) => {
		setLoading(name);
		setError(null);
		try {
			const response = await fetch(`/data/${encodeURIComponent(name)}`);
			if (!response.ok)
				throw new Error(`Could not read ${name} (${response.status})`);
			const text = await response.text();
			onFile(new File([text], name, { type: "application/json" }));
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Could not read the file.",
			);
		} finally {
			setLoading(null);
		}
	};

	return (
		<Card className="p-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
					Found in ./data
				</span>
				{files.map((file) => (
					<Button
						key={file.name}
						size="sm"
						disabled={disabled || loading !== null}
						onClick={() => load(file.name)}
					>
						{loading === file.name ? "Loading…" : file.name}
						<span className="font-mono text-[10px] text-slate-400">
							{formatBytes(file.size)}
						</span>
					</Button>
				))}
			</div>
			{error ? (
				<p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
			) : null}
		</Card>
	);
}
