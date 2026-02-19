import { NextRequest } from "next/server";

import connectDB from "@/lib/db";
import userModel from "@/models/user.model";
import emailValidator from "email-validator";
import { cloudinary } from "@/lib/services";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { errorResponse, successResponse } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
    await connectDB();

    try {
        const formData = await request.formData();

        const fullName = formData.get("fullName") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const file = formData.get("avatar") as File | null;

        // 🔹 Validation
        if (!fullName || !email || !password) {
            return errorResponse(400, "Every Field is Required!");
        }

        if (!emailValidator.validate(email)) {
            return errorResponse(400, "Please Enter Valid Email Address");
        }

        if (password.length < 6) {
            return errorResponse(
                400,
                "Password Must Be Atleast 6 Character Long"
            );
        }

        // 🔹 Check if email exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return errorResponse(400, "Email Already Exists!", email);
        }

        // 🔹 Create user
        const newUser = await userModel.create({
            fullName,
            email,
            password,
        });

        // 🔹 Handle Avatar Upload (if exists)
        if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const tempPath = path.join(process.cwd(), "public", file.name);
            await writeFile(tempPath, buffer);

            try {
                const uploaded = await cloudinary.uploader.upload(tempPath, {
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
                });

                newUser.avatar.public_id = uploaded.public_id;
                newUser.avatar.secure_url = uploaded.secure_url;
                await newUser.save();

                fs.rmSync(tempPath);
            } catch (err) {
                return errorResponse(
                    501,
                    "Error in Uploading Profile to Cloudinary",
                    (err as Error).message
                );
            }
        }

        // 🔹 Remove password before response
        const userObj = newUser.toObject();
        const { password: _, ...userWithoutPassword } = userObj;

        return successResponse(
            200,
            "Account Created Successfully",
            { User: userWithoutPassword }
        );

    } catch (error) {
        return errorResponse(400, "Error In Register", (error as Error).message);
    }
}
