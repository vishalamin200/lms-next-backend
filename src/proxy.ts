import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Parse allowed origins once
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

export function proxy(request: NextRequest) {
    const origin = request.headers.get("origin");

    const isAllowedOrigin =
        origin !== null && allowedOrigins.includes(origin);

    // 🔥 Handle Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
        const response = new NextResponse(null, { status: 204 });

        if (isAllowedOrigin) {
            response.headers.set(
                "Access-Control-Allow-Origin",
                origin
            );
        }

        response.headers.set(
            "Access-Control-Allow-Credentials",
            "true"
        );
        response.headers.set(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        );
        response.headers.set(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
        );

        return response;
    }

    // 🔥 Normal Requests
    const response = NextResponse.next();

    if (isAllowedOrigin) {
        response.headers.set(
            "Access-Control-Allow-Origin",
            origin
        );
    }

    response.headers.set(
        "Access-Control-Allow-Credentials",
        "true"
    );

    return response;
}

export const config = {
    matcher: "/user/:path*", // applies to all /user APIs
};
