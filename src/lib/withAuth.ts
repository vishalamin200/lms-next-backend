import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import jwt, { JwtPayload as DefaultJwtPayload } from "jsonwebtoken";

import connectDB from "@/lib/db";
import userModel, { IUser } from "@/models/user.model";
import { errorResponse } from "@/lib/apiResponse";


// ============================================
// 🔹 Types
// ============================================

type Role = "USER" | "INSTRUCTOR" | "ADMIN";

interface JwtPayload extends DefaultJwtPayload {
    id: string;
    email: string;
    role: Role;
}

type RouteContext<T> = {
    params: T;
};


// ============================================
// 🔹 withAuth (Generic + Fully Typed)
// ============================================

export function withAuth<TParams = unknown>(
    handler: (
        req: NextRequest,
        user: IUser,
        context: RouteContext<TParams>
    ) => Promise<Response>,
    allowedRoles?: Role[]
) {
    return async (
        req: NextRequest,
        context: RouteContext<TParams>
    ): Promise<Response> => {

        await connectDB();

        try {
            // 🔹 Read token from cookies
            const token = (await cookies()).get("token")?.value;

            if (!token) {
                return errorResponse(
                    401,
                    "User is Not loggedIn",
                    "Token Might be Expired"
                );
            }

            // 🔹 Verify JWT
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET_KEY as string
            ) as JwtPayload;

            // 🔹 Fetch user
            const user = await userModel.findById(decoded.id);

            if (!user) {
                return errorResponse(401, "Unauthorized User");
            }

            // 🔹 Role Check (if provided)
            if (
                allowedRoles &&
                !allowedRoles.includes(user.role as Role)
            ) {
                return errorResponse(
                    403,
                    "Forbidden: Insufficient Permissions"
                );
            }

            // 🔹 Call actual handler
            return handler(req, user, context);

        } catch (error) {

            if (
                error instanceof jwt.TokenExpiredError
            ) {
                return errorResponse(
                    401,
                    "Session Expired, Please Login Again"
                );
            }

            return errorResponse(
                401,
                "Unauthorized",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    };
}
