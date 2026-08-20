/**
 * Outbound HTTP correlation — request-id propagation for axios.
 *
 * Installs a GLOBAL interceptor on the default axios instance so every outbound
 * call forwards, from the current AsyncLocalStorage context:
 *   - `x-request-id`: the inbound correlation id (so the downstream reuses it)
 *   - `x-proxy`: this service's name (so the downstream records who called it)
 *
 * Covers existing `axios.get/post/...` call sites with no per-file changes.
 * Outside an HTTP request there's no context, so no headers are added.
 */

import axios, { type InternalAxiosRequestConfig } from "axios";
import {
  getContext,
  REQUEST_ID_HEADER,
  PROXY_HEADER,
} from "../logging/requestContext";

const SERVICE_NAME = process.env.SERVICE_NAME || "marketplace";

let installed = false;

export function installCorrelation() {
  if (installed) return;
  axios.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
    const ctx = getContext();
    if (ctx?.requestId) {
      cfg.headers.set(REQUEST_ID_HEADER, ctx.requestId);
      cfg.headers.set(PROXY_HEADER, SERVICE_NAME);
    }
    return cfg;
  });
  installed = true;
}
