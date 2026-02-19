import { NextRequest } from "next/server";
import { cloudinary } from "@/lib/services";

import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import userModel from "@/models/user.model";

export const DELETE = withAuth(
    async (req: NextRequest) => {
        try {
            const { userId } = await req.json();

            // 🔹 Validate input
            if (!userId) {
                return errorResponse(
                    400,
                    "UserId Is Missing"
                );
            }

            // 🔹 Check if user exists
            const user = await userModel.findById(userId);

            if (!user) {
                return errorResponse(
                    401,
                    "User Doesn't Exist!"
                );
            }

            // 🔹 Remove profile picture from Cloudinary
            const publicId = user?.avatar?.public_id;

            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error("Cloudinary delete error:", err);
                }
            }

            // 🔹 Delete user
            const deletedUser = await userModel.findByIdAndDelete(userId);

            if (!deletedUser) {
                return errorResponse(
                    401,
                    "User Doesn't Exist!"
                );
            }

            return successResponse(
                200,
                "Account Suspended Successfully"
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Delete Account",
                (error as Error).message
            );
        }
    },
    ["ADMIN"] // 🔥 Only ADMIN can access
);
