import { createFileRoute } from "@tanstack/react-router";
import { Home } from "../HomePage";

export const Route = createFileRoute("/")({ component: Home });
