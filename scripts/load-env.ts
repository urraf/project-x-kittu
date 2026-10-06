/** Loads .env / .env.local for CLI scripts using Next's own env loader. */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
