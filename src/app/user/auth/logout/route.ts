import { cookies } from "next/headers";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";

export const GET = withAuth(async () => {
    try {
        // 🔥 Clear the token cookie
        (await cookies()).set({
            name: "token",
            value: "",
            httpOnly: true,
            secure: true,          // required for cross-site
            sameSite: "none",      // since frontend & backend are different domains
            path: "/",
            maxAge: 0,             // expire immediately
        });

        return successResponse(
            200,
            "Logout Successfully"
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error in Logout",
            (error as Error).message
        );
    }
});
