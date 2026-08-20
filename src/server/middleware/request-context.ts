/**
 * Request Context Middleware (Express) — register FIRST, before everything.
 *
 * Mint/reuse x-request-id, capture ip + upstream proxy, MUTATE req.headers so
 * downstream proxies forward x-request-id + x-proxy, echo the id back, and bind
 * a RequestContext for the request's async tree.
 */

import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";
import {
  runWithContext,
  REQUEST_ID_HEADER,
  PROXY_HEADER,
  type RequestContext,
} from "../logging/requestContext";

const SERVICE_NAME = process.env.SERVICE_NAME || "marketplace";

function headerStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function resolveIp(req: Request): string {
  const fwd = headerStr(req.headers["x-forwarded-for"]);
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "";
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = headerStr(req.headers[REQUEST_ID_HEADER]);
  const requestId =
    incoming && incoming.length > 0 && incoming.length <= 64
      ? incoming
      : randomUUID();

  const inboundProxy = headerStr(req.headers[PROXY_HEADER]) ?? "client";

  // Mutate inbound headers so downstream proxies forward them.
  req.headers[REQUEST_ID_HEADER] = requestId;
  req.headers[PROXY_HEADER] = SERVICE_NAME;

  res.setHeader(REQUEST_ID_HEADER, requestId);

  const ctx: RequestContext = {
    requestId,
    ip: resolveIp(req),
    method: req.method,
    path: (req.originalUrl || req.url || "").split("?")[0],
    proxy: inboundProxy,
    startTime: Date.now(),
  };

  runWithContext(ctx, () => next());
}

export default requestContext;
