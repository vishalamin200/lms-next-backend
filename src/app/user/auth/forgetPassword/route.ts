import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";
import userModel from "@/models/user.model";
import sendResetEmail from "@/lib/sendEmail";

export async function POST(req: NextRequest) {
    await connectDB();

    try {
        const { email } = await req.json();

        // 🔹 Validate email
        if (!email) {
            return errorResponse(
                400,
                "Email Field is Required"
            );
        }

        // 🔹 Check if user exists
        const user = await userModel.findOne({ email });

        if (!user) {
            return errorResponse(
                400,
                "No Account Exists with This Email"
            );
        }

        try {
            // 🔥 Generate Reset Token (your model method)
            const token = await user.resetPasswordToken();

            // 🔥 Send Email
            await sendResetEmail(
                user._id.toString(),
                user.email,
                user.fullName,
                token
            );

            return successResponse(
                200,
                "Email Send Successfully",
                {
                    fullName: user.fullName,
                    email: user.email,
                }
            );

        } catch (error) {
            // 🔥 Cleanup if email sending fails
            user.forgetPasswordToken = undefined;
            user.forgetPasswordExpiry = undefined;
            await user.save();

            return errorResponse(
                400,
                "Error in Sending Email",
                (error as Error).message
            );
        }

    } catch (error) {
        return errorResponse(
            400,
            "Error in Forget Password",
            (error as Error).message
        );
    }
}
