import { useActor } from "@xstate/react";
import { useI18n } from "../lib/i18n";
import { type LocalFile, localDataMachine } from "../machines/localDataMachine";
import { Button, Card } from "./ui";

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
	const { t } = useI18n();
	const [localSnapshot, localSend] = useActor(localDataMachine, {
		input: { onFile },
	});
	const files: LocalFile[] = localSnapshot.context.files;
	const loading = localSnapshot.context.loadingName;
	const error = localSnapshot.context.error;

	if (
		!localSnapshot.matches("listed") &&
		!localSnapshot.matches("loading") &&
		!localSnapshot.matches("failure")
	) {
		return null;
	}

	const load = (name: string) => {
		localSend({ type: "LOAD", name });
	};

	return (
		<Card className="p-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
					{t("local.title")}
				</span>
				{files.map((file) => (
					<Button
						key={file.name}
						size="sm"
						disabled={disabled || loading !== null}
						onClick={() => load(file.name)}
					>
						{loading === file.name ? t("local.loading") : file.name}
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
