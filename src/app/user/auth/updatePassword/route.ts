import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import userModel from "@/models/user.model";

export const POST = withAuth(
    async (req: NextRequest, user) => {
        try {
            const { currPassword, newPassword } = await req.json();

            // 🔹 Validate input
            if (!currPassword || !newPassword) {
                return errorResponse(
                    400,
                    "Current Password and New Password are required"
                );
            }

            if (newPassword.length < 6) {
                return errorResponse(
                    400,
                    "Password must be at least 6 characters long"
                );
            }

            // 🔹 Fetch user with password field
            const existingUser = await userModel
                .findById(user._id)
                .select("+password");

            if (!existingUser) {
                return errorResponse(
                    401,
                    "Please LoggedIn to Update Password"
                );
            }

            // 🔹 Compare current password
            const isValidPassword =
                await existingUser.comparePassword(currPassword);

            if (!isValidPassword) {
                return errorResponse(
                    400,
                    "Invalid Current Password"
                );
            }

            // 🔹 Update password
            existingUser.password = newPassword;
            await existingUser.save(); // pre("save") will hash it

            return successResponse(
                200,
                "Password Updated Successfully",
                {
                    id: existingUser._id,
                    fullName: existingUser.fullName,
                }
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error in Updating Password",
                (error as Error).message
            );
        }
    }
);
