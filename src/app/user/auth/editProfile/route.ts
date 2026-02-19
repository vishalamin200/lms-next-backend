import { NextRequest } from "next/server";
import { cloudinary } from "@/lib/services";

import connectDB from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import userModel, { IUser } from "@/models/user.model";

// ---------------------------------------------------
// PATCH → Edit Profile (Must Be Logged In)
// ---------------------------------------------------

export const PATCH = withAuth(
    async (req: NextRequest, user: IUser) => {
        await connectDB();

        try {
            const userId = user._id;

            const formData = await req.formData();

            const fullName = formData.get("fullName") as string;
            const contact = formData.get("contact") as string;
            const linkedin = formData.get("linkedin") as string;
            const address = formData.get("address") as string;
            const removeProfile = formData.get("removeProfile") as string;
            const file = formData.get("avatar") as File | null;

            if (!fullName || fullName.length < 3) {
                return errorResponse(400, "Name Is Too Short");
            }

            const User = await userModel.findByIdAndUpdate(
                userId,
                { fullName, contact, linkedin, address },
                { new: true }
            );

            if (!User) {
                return errorResponse(400, "Please Logged In Again, And Try");
            }

            // =====================================================
            // 🔥 REMOVE PROFILE
            // =====================================================

            if (removeProfile === "true") {
                const avatarPublicId = User?.avatar?.public_id;

                if (avatarPublicId) {
                    await cloudinary.uploader.destroy(avatarPublicId);
                }

                User.avatar.public_id = "";
                User.avatar.secure_url =
                    "https://res.cloudinary.com/dqtkulbwd/image/upload/v1723902171/Profile%20Picture/accfigp4wynlmdz9zajd.webp";

                await User.save();
            }

            // =====================================================
            // 🔥 UPDATE PROFILE IMAGE (SERVERLESS SAFE)
            // =====================================================

            if (file && file.size > 0) {
                try {
                    // 🔹 Remove old image
                    if (User?.avatar?.public_id) {
                        await cloudinary.uploader.destroy(User.avatar.public_id);
                    }

                    const bytes = await file.arrayBuffer();
                    const buffer = Buffer.from(bytes);

                    // 🔹 Upload using stream (NO FILESYSTEM)
                    const uploadResult = await new Promise<{
                        public_id: string;
                        secure_url: string;
                    }>((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: "Profile Picture",
                                transformation: [
                                    {
                                        width: 200,
                                        height: 200,
                                        gravity: "face",
                                        crop: "fill",
                                    },
                                ],
                                context: { alt: "Profile Picture" },
                            },
                            (error, result) => {
                                if (error || !result) {
                                    reject(error);
                                } else {
                                    resolve({
                                        public_id: result.public_id,
                                        secure_url: result.secure_url,
                                    });
                                }
                            }
                        );

                        stream.end(buffer);
                    });

                    User.avatar.public_id = uploadResult.public_id;
                    User.avatar.secure_url = uploadResult.secure_url;

                    await User.save();

                    const userObj = User.toObject();
                    const { password, ...UserWithoutPassword } = userObj;

                    return successResponse(200, "Profile Updated Successfully", {
                        User: UserWithoutPassword,
                    });
                } catch (error) {
                    return errorResponse(
                        400,
                        "Error in Uploading Profile Picture",
                        error instanceof Error ? error.message : "Unknown Error"
                    );
                }
            }

            // =====================================================
            // 🔥 PROFILE UPDATED WITHOUT IMAGE
            // =====================================================

            const userObj = User.toObject();
            const { password, ...UserWithoutPassword } = userObj;

            return successResponse(200, "Profile Updated Successfully", {
                Remark: "Profile Picture is Not Changed",
                User: UserWithoutPassword,
            });
        } catch (error) {
            return errorResponse(
                400,
                "Error In Edit Profile",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    }
);
