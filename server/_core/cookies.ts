import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  // Direct HTTPS protocol
  if (req.protocol === "https") return true;

  // Check x-forwarded-proto header (set by reverse proxies like Nginx, CloudFlare)
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto)
      ? forwardedProto
      : forwardedProto.split(",");
    if (protoList.some(proto => proto.trim().toLowerCase() === "https")) {
      return true;
    }
  }

  // Check x-forwarded-proto from CloudFlare or other CDNs
  const cfProto = req.headers["cf-visitor"];
  if (cfProto && typeof cfProto === "string") {
    try {
      const parsed = JSON.parse(cfProto);
      if (parsed.scheme === "https") return true;
    } catch {}
  }

  // In development with localhost, allow insecure
  if (req.hostname && LOCAL_HOSTS.has(req.hostname)) {
    return true;
  }

  return false;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);
  
  // Log for debugging
  if (process.env.DEBUG_COOKIES) {
    console.log("[Cookie] secure=", secure, "hostname=", req.hostname, "protocol=", req.protocol);
  }

  return {
    httpOnly: true,
    path: "/",
    // Use 'lax' for better compatibility; 'none' requires Secure=true which may fail
    // if HTTPS detection is incorrect. 'lax' allows same-site requests and top-level navigation.
    sameSite: "lax",
    secure,
  };
}
