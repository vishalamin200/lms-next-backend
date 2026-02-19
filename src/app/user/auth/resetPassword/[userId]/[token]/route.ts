import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";
import userModel from "@/models/user.model";

interface RouteParams {
    params: {
        userId: string;
        token: string;
    };
}

export async function POST(
    req: NextRequest,
    { params }: RouteParams
) {
    await connectDB();

    try {
        const { userId, token } = params;
        const { newPassword } = await req.json();

        // 🔹 Validate new password
        if (!newPassword || newPassword.length < 6) {
            return errorResponse(
                400,
                "Password must be at least 6 characters long"
            );
        }

        // 🔹 Find user
        const user = await userModel
            .findById(userId)
            .select("+password");

        if (!user) {
            return errorResponse(
                400,
                "User Does Not Exist!"
            );
        }

        // 🔹 Validate token
        const isValidToken = await user.validateToken(token);

        if (!isValidToken) {
            return errorResponse(
                400,
                "Token is Expired Please Try Again"
            );
        }

        // 🔥 Update password (pre("save") will hash it)
        user.password = newPassword;

        // 🔥 Clear reset token fields
        user.forgetPasswordExpiry = new Date(0);
        user.forgetPasswordToken = "";

        await user.save();

        return successResponse(
            200,
            "Password Reset Successfully",
            user.email
        );

    } catch (error) {
        return errorResponse(
            500,
            "Error in Reset Password",
            (error as Error).message
        );
    }
}
