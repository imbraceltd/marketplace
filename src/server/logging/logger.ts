/**
 * Structured logger — dependency-free, single-line JSON to stdout
 * (Promtail/Loki friendly). Identical output schema to every other imbrace
 * service so logs are uniform.
 *
 * Canonical log shape (all keys lowercase, this order):
 *   ip, request_id, date_time (ISO 8601 UTC), time (epoch ms), method_request,
 *   request_path, service_name, env, type_of_entity, function_of_code,
 *   description_message, response_time, status_code, proxy, level
 *
 * Correlation fields are pulled automatically from AsyncLocalStorage — call
 * sites only pass what they know:
 *   logger.info("Use_case_exported", { function: "createUseCaseTemplateV2" });
 *
 * Two call styles, both supported:
 *   logger.info("msg", { function, entity, status_code, response_time, ...extra })
 *   logger.error("Export failed:", err, 500)  // positional extras -> `details`
 */

import { getContext } from "./requestContext";

const SERVICE_NAME = process.env.SERVICE_NAME || "marketplace";

// Deployment tier for log filtering (Loki `{env="dev"}`). Decoupled from
// ENV/NODE_ENV (which gate behavior): prefer explicit DEPLOY_ENV, else
// normalize whatever native env value exists to dev/staging/prodv2.
const normalizeEnv = (raw?: string): string => {
  const v = (raw || "").toLowerCase();
  if (v.includes("prod")) return "prodv2";
  if (v.includes("stag") || v === "stg") return "staging";
  if (v.includes("dev") || v.includes("local")) return "dev";
  return v || "dev";
};
const ENV =
  process.env.DEPLOY_ENV || normalizeEnv(process.env.NODE_ENV || process.env.ENV);

type Level = "error" | "warn" | "info" | "http" | "debug";

interface LogMeta {
  function?: string;
  entity?: string;
  status_code?: number;
  response_time?: number;
  [k: string]: unknown;
}

// JSON.stringify replacer: break circular refs and unwrap Error objects.
const safeReplacer = () => {
  const seen = new WeakSet<object>();
  return (_key: string, val: unknown) => {
    if (val instanceof Error) {
      return { name: val.name, message: val.message, stack: val.stack };
    }
    if (typeof val === "object" && val !== null) {
      if (seen.has(val as object)) return "[Circular]";
      seen.add(val as object);
    }
    if (typeof val === "bigint") return val.toString();
    return val;
  };
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Error);

function safeStringifyValue(v: unknown): string {
  try {
    return typeof v === "string" ? v : JSON.stringify(v, safeReplacer());
  } catch {
    return String(v);
  }
}

function emit(level: Level, args: unknown[]) {
  const [rawMessage, ...extra] = args;
  const message =
    typeof rawMessage === "string" ? rawMessage : safeStringifyValue(rawMessage);

  // Style A: single trailing options object -> structured meta.
  // Style B: anything else -> positional `details`.
  let meta: LogMeta = {};
  let details: unknown[] = [];
  if (extra.length === 1 && isPlainObject(extra[0])) {
    meta = extra[0] as LogMeta;
  } else if (extra.length > 0) {
    details = extra.filter((v) => {
      if (v instanceof Error) return true;
      if (isPlainObject(v)) return Object.keys(v).length > 0;
      return true;
    });
  }

  const { function: fn, entity, status_code, response_time, ...rest } = meta;
  const ctx = getContext();
  const now = Date.now();

  const line: Record<string, unknown> = {
    ip: ctx?.ip ?? "",
    request_id: ctx?.requestId ?? "",
    date_time: new Date(now).toISOString(),
    time: now,
    method_request: ctx?.method ?? "",
    request_path: ctx?.path ?? "",
    service_name: SERVICE_NAME,
    env: ENV,
    type_of_entity: entity ?? "EMPTY",
    function_of_code: fn ?? "",
    description_message: message,
    response_time: response_time ?? undefined,
    status_code: status_code ?? undefined,
    proxy: ctx?.proxy ?? "",
    level,
  };

  if (Object.keys(rest).length > 0) line.meta = rest;
  if (details.length > 0) line.details = details;

  process.stdout.write(JSON.stringify(line, safeReplacer()) + "\n");
}

export const logger = {
  error: (...args: unknown[]) => emit("error", args),
  warn: (...args: unknown[]) => emit("warn", args),
  info: (...args: unknown[]) => emit("info", args),
  http: (...args: unknown[]) => emit("http", args),
  debug: (...args: unknown[]) => emit("debug", args),
  log: (level: Level, ...args: unknown[]) => emit(level, args),
};

export default logger;
