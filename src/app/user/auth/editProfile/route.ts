import { NextRequest } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import { cloudinary } from "@/lib/services";

import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import userModel from "@/models/user.model";

export const PATCH = withAuth(async (req: NextRequest, user) => {
    try {
        const formData = await req.formData();

        const fullName = formData.get("fullName") as string;
        const contact = formData.get("contact") as string;
        const linkedin = formData.get("linkedin") as string;
        const address = formData.get("address") as string;
        const removeProfile = formData.get("removeProfile") as string;
        const file = formData.get("avatar") as File | null;

        // 🔹 Validate name
        if (fullName && fullName.length < 3) {
            return errorResponse(400, "Name Is Too Short");
        }

        // 🔹 Update basic details
        const updatedUser = await userModel.findByIdAndUpdate(
            user._id,
            { fullName, contact, linkedin, address },
            { new: true }
        );

        if (!updatedUser) {
            return errorResponse(
                400,
                "Please Logged In Again, And Try"
            );
        }

        // 🔥 Remove Profile Picture
        if (removeProfile === "true") {
            if (updatedUser.avatar?.public_id) {
                await cloudinary.uploader.destroy(
                    updatedUser.avatar.public_id
                );
            }

            updatedUser.avatar.public_id = "";
            updatedUser.avatar.secure_url =
                "https://res.cloudinary.com/dqtkulbwd/image/upload/v1723902171/Profile%20Picture/accfigp4wynlmdz9zajd.webp";

            await updatedUser.save();
        }

        // 🔥 Upload New Avatar
        if (file && file.size > 0) {
            try {
                // Remove old avatar
                if (updatedUser.avatar?.public_id) {
                    await cloudinary.uploader.destroy(
                        updatedUser.avatar.public_id
                    );
                }

                // Save temp file
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const tempPath = path.join(process.cwd(), "public", file.name);
                await writeFile(tempPath, buffer);

                // Upload to Cloudinary
                const response = await cloudinary.uploader.upload(
                    tempPath,
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
                    }
                );

                if (!response.public_id) {
                    return errorResponse(
                        501,
                        "Error In Updating New Profile Picture"
                    );
                }

                updatedUser.avatar.public_id = response.public_id;
                updatedUser.avatar.secure_url = response.secure_url;

                await updatedUser.save();

                fs.rmSync(tempPath);

            } catch (error) {
                return errorResponse(
                    501,
                    "Error In Uploading New Profile Picture",
                    (error as Error).message
                );
            }
        }

        // 🔹 Remove password before response
        const userObj = updatedUser.toObject();
        const { password, ...userWithoutPassword } = userObj;

        return successResponse(
            200,
            "Profile Updated Successfully",
            userWithoutPassword
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error In Edit Profile",
            (error as Error).message
        );
    }
});
