/**
 * HTTP Access Logger Middleware (Express) — structured, replaces morgan.
 *
 * Emits exactly ONE canonical JSON access line per request, on response finish,
 * carrying status_code and response_time. Correlation fields come from the
 * AsyncLocalStorage context populated by `requestContext` (which MUST run
 * before this). Level reflects the outcome: 5xx -> error, 4xx -> warn, else info.
 */

import type { Request, Response, NextFunction } from "express";
import logger from "../logging/logger";
import { getContext } from "../logging/requestContext";

export const accessLogger = (req: Request, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    const ctx = getContext();
    const responseTime = ctx ? Date.now() - ctx.startTime : undefined;
    const status = res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    logger.log(level, "http_request_completed", {
      function: "accessLogger",
      entity: "EMPTY",
      status_code: status,
      response_time: responseTime,
    });
  });

  next();
};

export default accessLogger;
