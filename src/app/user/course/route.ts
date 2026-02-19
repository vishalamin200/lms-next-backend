import { cloudinary } from "@/lib/services";
import fs from "fs";
import { writeFile } from "fs/promises";
import { NextRequest } from "next/server";
import path from "path";

import connectDB from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { errorResponse, successResponse } from "@/lib/apiResponse";

import courseModel from "@/models/course.model";
import userModel from "@/models/user.model";


// =======================================================
// 🔹 CREATE COURSE (INSTRUCTOR / ADMIN)
// =======================================================

export const POST = withAuth(
    async (req: NextRequest, user) => {
        await connectDB();

        try {
            const formData = await req.formData();

            const topic = formData.get("topic") as string;
            const description = formData.get("description") as string;
            const category = formData.get("category") as string;
            const createdBy = formData.get("createdBy") as string;
            const creatorEmail = formData.get("creatorEmail") as string;
            const file = formData.get("thumbnail") as File | null;

            // 🔹 Validate

            if (!topic) {
                return errorResponse(400, "Topic is required");
            }

            if (!description) {
                return errorResponse(400, "Description is required");
            }

            if (!category) {
                return errorResponse(400, "Category is required");
            }

            if (!createdBy) {
                return errorResponse(400, "CreatedBy is required");
            }

            if (!creatorEmail) {
                return errorResponse(400, "Email is required");
            }

            if (!file) {
                return errorResponse(400, "Thumbnail is required");
            }



            // 🔹 Format category
            const formattedCategory = category
                .trim()
                .replace(/\s+/g, "-")
                .toLowerCase();

            // 🔹 Create course first
            const newCourse = await courseModel.create({
                topic,
                description,
                category: formattedCategory,
                createdBy,
                creatorEmail,
            });

            if (!newCourse) {
                return errorResponse(
                    400,
                    "Error In Creating New Course"
                );
            }

            // 🔥 Handle thumbnail upload
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const tempPath = path.join(
                process.cwd(),
                "public",
                file.name
            );

            await writeFile(tempPath, buffer);

            const result = await cloudinary.uploader.upload(
                tempPath,
                {
                    folder: "courseThumbnail",
                    context: { alt: "Coursethumbnail" },
                }
            );

            // 🔹 Save thumbnail info
            if (!newCourse.thumbnail) {
                newCourse.thumbnail = {} as { public_id: string; secure_url: string };
            }
            newCourse.thumbnail.public_id = result.public_id;
            newCourse.thumbnail.secure_url = result.secure_url;

            await newCourse.save();

            // Remove temp file
            fs.rmSync(tempPath);

            // 🔥 Save course reference in instructor
            const instructor = await userModel.findById(user._id);

            if (instructor) {
                instructor.createdCourses.push({
                    courseId: newCourse._id,
                    createdAt: new Date(),
                });
                await instructor.save();
            }

            return successResponse(
                200,
                "Course Created Successfully",
                newCourse
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error in Creating Course",
                (error as Error).message
            );
        }
    },
    ["INSTRUCTOR", "ADMIN"] // 🔥 Role protection
);


// =======================================================
// 🔹 VIEW COURSES (PUBLIC)
// =======================================================

export async function GET() {
    await connectDB();

    try {
        const allCourses = await courseModel.find({});

        return successResponse(
            200,
            "Fetch Courses Successfully",
            allCourses
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error In Fetch Courses from Database",
            (error as Error).message
        );
    }
}
