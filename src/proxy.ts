import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigin = "http://localhost:3001"; // change in production

export function proxy(request: NextRequest) {
    const origin = request.headers.get("origin");

    const isAllowedOrigin = origin === allowedOrigin;

    // 🔥 Handle Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
        const response = new NextResponse(null, { status: 204 });

        if (isAllowedOrigin) {
            response.headers.set("Access-Control-Allow-Origin", origin!);
        }

        response.headers.set("Access-Control-Allow-Credentials", "true");
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
        response.headers.set("Access-Control-Allow-Origin", origin!);
    }

    response.headers.set("Access-Control-Allow-Credentials", "true");

    return response;
}

export const config = {
    matcher: "/user/:path*", // 👈 applies to all app/user/* APIs
};
