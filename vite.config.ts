import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackRouter } from "@tanstack/router-plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Dev-only convenience: serves JSON files from `./data` so you can drop your
 * Timeline export into the project folder and load it with one click, instead
 * of using the file picker every time. Never active in a production build.
 */
function localTimelineData(): Plugin {
	return {
		name: "local-timeline-data",
		apply: "serve",
		configureServer(server) {
			const dataDir = path.resolve(server.config.root, "data");

			server.middlewares.use("/__local-data", (_request, response) => {
				let files: Array<{ name: string; size: number }> = [];
				try {
					files = fs
						.readdirSync(dataDir)
						.filter((name) => name.toLowerCase().endsWith(".json"))
						.map((name) => ({
							name,
							size: fs.statSync(path.join(dataDir, name)).size,
						}));
				} catch {
					files = [];
				}
				response.setHeader("content-type", "application/json");
				response.end(JSON.stringify({ files }));
			});

			server.middlewares.use("/data", (request, response, next) => {
				const raw = decodeURIComponent((request.url ?? "").split("?")[0]);
				const filePath = path.resolve(dataDir, raw.replace(/^\/+/, ""));
				if (!filePath.startsWith(dataDir)) {
					response.statusCode = 403;
					response.end("Forbidden");
					return;
				}
				fs.readFile(filePath, (error, data) => {
					if (error) {
						next();
						return;
					}
					response.setHeader("content-type", "application/json");
					response.end(data);
				});
			});
		},
	};
}

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		viteReact(),
		localTimelineData(),
	],
});

export default config;
