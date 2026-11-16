import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { I18nextProvider } from "react-i18next";

import { i18n } from "../lib/i18n";
import "../styles.css";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	return (
		<>
			<I18nextProvider i18n={i18n}>
				<Outlet />
			</I18nextProvider>
			{import.meta.env.DEV ? (
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "TanStack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
			) : null}
		</>
	);
}
