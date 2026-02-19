import { cookies } from "next/headers";
import { cloudinary } from "@/lib/services";

import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import userModel from "@/models/user.model";

export const DELETE = withAuth(async (_req, user) => {
    try {
        // 🔹 Prevent ADMIN from deleting account
        if (user.role === "ADMIN") {
            return errorResponse(
                400,
                "Admin Can't Delete Their Account"
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

        // 🔹 Delete user from DB
        const deletedUser = await userModel.findByIdAndDelete(user._id);

        if (!deletedUser) {
            return errorResponse(
                401,
                "User Doesn't Exist!"
            );
        }

        

        (await cookies()).set({
            name: "token",
            value: "",
            httpOnly: true,
            secure: true,
            sameSite:  "none",
            path: "/",
            maxAge: 0,
        });

        return successResponse(
            200,
            "Account Deleted Successfully"
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error In Delete Account",
            (error as Error).message
        );
    }
});
