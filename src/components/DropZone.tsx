import { useActor } from "@xstate/react";
import { useRef } from "react";
import { useI18n } from "../lib/i18n";
import { dropZoneMachine } from "../machines/dropZoneMachine";
import { Badge, Card, cn, SectionHeader } from "./ui";

type Props = {
	onFiles: (files: File[]) => void;
	busy: boolean;
	progress: string | null;
	error: string | null;
	hasHistory: boolean;
};

export function DropZone({
	onFiles,
	busy,
	progress,
	error,
	hasHistory,
}: Props) {
	const { t } = useI18n();
	const [dropSnapshot, dropSend] = useActor(dropZoneMachine);
	const inputRef = useRef<HTMLInputElement>(null);
	const dragging = dropSnapshot.matches("dragging");

	const handleFiles = (list: FileList | null) => {
		if (!list || list.length === 0) return;
		onFiles(Array.from(list));
	};

	return (
		<Card>
			<SectionHeader
				step="1"
				title={hasHistory ? t("drop.titleAgain") : t("drop.titleFirst")}
				description={
					hasHistory ? t("drop.descriptionAgain") : t("drop.descriptionFirst")
				}
				action={
					<Badge tone="ok">
						<span className="size-1.5 rounded-full bg-mint" />
						{t("drop.local")}
					</Badge>
				}
			/>

			<div className="p-5">
				<button
					type="button"
					disabled={busy}
					onDragOver={(event) => {
						event.preventDefault();
						dropSend({ type: "DRAG_ENTER" });
					}}
					onDragLeave={() => dropSend({ type: "DRAG_LEAVE" })}
					onDrop={(event) => {
						event.preventDefault();
						dropSend({ type: "DROP" });
						handleFiles(event.dataTransfer.files);
					}}
					onClick={() => inputRef.current?.click()}
					className={cn(
						"group flex w-full flex-col items-center justify-center gap-2 rounded-[26px] border-[3px] border-dashed px-6 py-10 text-center transition-all",
						dragging
							? "border-coral bg-sun/25 dark:border-coral dark:bg-white/10"
							: "border-ink/20 hover:-translate-y-0.5 hover:border-ink/35 hover:bg-sun/20 dark:border-white/20 dark:hover:border-white/35 dark:hover:bg-white/5",
						busy && "cursor-wait opacity-70",
					)}
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						className="size-9 text-ink/35 transition-transform group-hover:scale-110 dark:text-white/40"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
						/>
					</svg>
					<span className="text-base font-extrabold text-ink dark:text-white">
						{busy ? t("drop.reading") : t("drop.drop")}
					</span>
					<span className="max-w-md text-xs font-medium text-ink/50 dark:text-white/50">
						{t("drop.formats")}
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
						<span className="size-2 animate-pulse rounded-full bg-coral" />
						{progress}
					</div>
				) : null}

				{error ? (
					<p className="mt-4 rounded-lg bg-coral/10 px-3 py-2 text-sm font-semibold text-coral ring-1 ring-coral/30">
						{error}
					</p>
				) : null}

				<details className="mt-5 rounded-2xl border-2 border-ink/8 bg-sun/10 p-4 text-sm dark:border-white/10 dark:bg-white/5">
					<summary className="cursor-pointer font-extrabold text-ink/80 dark:text-white/80">
						{t("drop.where")}
					</summary>
					<div className="mt-3 space-y-3 text-ink/65 dark:text-white/65">
						<div>
							<p className="font-bold text-ink/80 dark:text-white/80">
								{t("drop.android")}
							</p>
							<p className="text-xs font-medium text-ink/50 dark:text-white/50">
								{t("drop.androidHelp")}
							</p>
						</div>
						<div>
							<p className="font-bold text-ink/80 dark:text-white/80">
								{t("drop.ios")}
							</p>
							<p className="text-xs font-medium text-ink/50 dark:text-white/50">
								{t("drop.iosHelp")}
							</p>
						</div>
					</div>
				</details>
			</div>
		</Card>
	);
}
