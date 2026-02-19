import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { writeFile } from "fs/promises";
import mongoose, { HydratedDocument } from "mongoose";
import { NextRequest } from "next/server";
import path from "path";

import { errorResponse, successResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";
import { withAuth } from "@/lib/withAuth";

import courseModel, { ICourse } from "@/models/course.model";
import userModel, { IUser } from "@/models/user.model";
import { uploadToYoutube } from "@/utils/uploadToYoutube";

// =====================================================
// 🔹 Shared Types
// =====================================================

type CourseDoc = HydratedDocument<ICourse>;
type RouteContext = { params: Promise<{ id: string }> };

// =====================================================
// 🔹 UPDATE COURSE
// =====================================================

export const PUT = withAuth(
    async (
        req: NextRequest,
        user: IUser,
        context: RouteContext
    ) => {
        await connectDB();

        try {
            const { id: courseId } = await context.params;

            if (!mongoose.isValidObjectId(courseId)) {
                return errorResponse(400, "Invalid Course Id");
            }

            const course = await courseModel.findById(courseId) as CourseDoc | null;

            if (!course) {
                return errorResponse(404, "Course Doesn't Exist");
            }

            const formData = await req.formData();
            const file = formData.get("thumbnail");

            const updateFields: Partial<ICourse> = {};

            formData.forEach((value, key) => {
                if (key !== "thumbnail" && typeof value === "string") {
                    (updateFields as Record<string, unknown>)[key] = value;
                }
            });

            if (typeof updateFields.category === "string") {
                updateFields.category = updateFields.category
                    .trim()
                    .replace(/\s+/g, "-")
                    .toLowerCase();
            }

            if (Object.keys(updateFields).length > 0) {
                await courseModel.findByIdAndUpdate(
                    courseId,
                    { $set: updateFields },
                    { new: true, runValidators: true }
                );
            }

            // 🔥 Handle Thumbnail Update
            if (file instanceof File && file.size > 0) {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                const tempPath = path.join(process.cwd(), "public", file.name);
                await writeFile(tempPath, buffer);

                const result = await cloudinary.uploader.upload(tempPath, {
                    folder: "courseThumbnail",
                    context: { alt: "coursethumbnail" },
                });

                fs.rmSync(tempPath);

                if (course.thumbnail?.public_id) {
                    await cloudinary.uploader.destroy(course.thumbnail.public_id);
                }

                course.thumbnail = {
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                };

                const updatedCourse = await course.save();

                return successResponse(200, "Course Updated Successfully", {
                    remark: "Thumbnail is Updated",
                    updatedCourse,
                });
            }

            const updatedCourse = await courseModel.findById(courseId);

            return successResponse(200, "Course Updated Successfully", {
                remark: "No Updation in Thumbnail",
                updatedCourse,
            });

        } catch (error) {
            return errorResponse(
                400,
                "Error in Course Update",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    },
    ["INSTRUCTOR", "ADMIN"]
);

// =====================================================
// 🔹 DELETE COURSE
// =====================================================

export const DELETE = withAuth(
    async (
        _req: NextRequest,
        user: IUser,
        context: RouteContext
    ) => {
        await connectDB();

        try {
            const { id: courseId } = await context.params;

            if (!mongoose.isValidObjectId(courseId)) {
                return errorResponse(400, "Invalid Course Id");
            }

            const course = await courseModel.findById(courseId) as CourseDoc | null;

            if (!course) {
                return errorResponse(400, "No Course Exist For Given CourseId");
            }

            const remarks: string[] = [];

            if (course.thumbnail?.public_id) {
                await cloudinary.uploader.destroy(course.thumbnail.public_id);
                remarks.push("Deleted Course Thumbnail");
            }

            const lectureThumbnailIds = course.lectures
                .map(l => l.thumbnail?.public_id)
                .filter((id): id is string => Boolean(id));

            if (lectureThumbnailIds.length > 0) {
                await cloudinary.api.delete_resources(lectureThumbnailIds);
                remarks.push("Deleted Lecture Thumbnails");
            }

            await userModel.updateOne(
                { _id: user._id },
                { $pull: { createdCourses: { courseId } } }
            );

            await courseModel.findByIdAndDelete(courseId);

            return successResponse(200, "Course Deleted Successfully", {
                Remark: remarks,
            });

        } catch (error) {
            return errorResponse(
                400,
                "Error In Deleting Course",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    },
    ["INSTRUCTOR", "ADMIN"]
);

// =====================================================
// 🔹 GET LECTURES
// =====================================================

export const GET = withAuth(
    async (
        _req: NextRequest,
        _user: IUser,
        context: RouteContext
    ) => {
        await connectDB();

        try {
            const { id: courseId } = await context.params;

            if (!mongoose.isValidObjectId(courseId)) {
                return errorResponse(400, "Invalid Course Id");
            }

            const course = await courseModel.findById(courseId);

            if (!course) {
                return errorResponse(400, "No Course Exist for Provided CourseId");
            }

            return successResponse(
                200,
                "Lectures Fetch Successfully",
                course.lectures
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Fetching Lectures",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    }
);

// =====================================================
// 🔹 ADD LECTURE
// =====================================================

export const POST = withAuth(
    async (
        req: NextRequest,
        _user: IUser,
        context: RouteContext
    ) => {
        await connectDB();

        try {
            const { id: courseId } = await context.params;

            if (!mongoose.isValidObjectId(courseId)) {
                return errorResponse(400, "Invalid Course Id");
            }

            const formData = await req.formData();

            const title = formData.get("title");
            const youtubeLink = formData.get("youtubeLink");
            const file = formData.get("video");

            if (typeof title !== "string" || !title.trim()) {
                return errorResponse(400, "Title Is Required");
            }

            if (
                !(file instanceof File && file.size > 0) &&
                typeof youtubeLink !== "string"
            ) {
                return errorResponse(400, "Provide youtube link or upload a file");
            }

            const course = await courseModel.findById(courseId) as CourseDoc | null;

            if (!course) {
                return errorResponse(400, "Course Doesn't Exist");
            }

            if (file instanceof File && file.size > 0) {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                const tempPath = path.join(process.cwd(), "public", file.name);
                await writeFile(tempPath, buffer);

                const response = await uploadToYoutube(tempPath, title);

                fs.rmSync(tempPath);

                course.lectures.push({
                    title,
                    description: (formData.get("description") as string) || "",
                    youtubeLink: "",
                    video: {
                        public_id: response.public_id,
                        secure_url: response.secure_url,
                    },
                });
            } else {
                course.lectures.push({
                    title,
                    description: (formData.get("description") as string) || "",
                    youtubeLink: youtubeLink as string,
                });
            }

            course.noOfLectures = course.lectures.length;
            await course.save();

            return successResponse(200, "Lecture Added Successfully", {
                Course: course,
            });

        } catch (error) {
            return errorResponse(
                400,
                "Error In Adding Lecture Video",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    },
    ["INSTRUCTOR", "ADMIN"]
);
