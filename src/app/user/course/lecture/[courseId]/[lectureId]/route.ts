import { NextRequest } from "next/server";
import mongoose, { HydratedDocument, Types } from "mongoose";

import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";

import courseModel, { ICourse } from "@/models/course.model";
import { IUser } from "@/models/user.model";

import {
    deleteVideoFromYoutube,
    updateVideoTitleFromYoutube,
    uploadToYoutubeFromBuffer,
} from "@/utils/uploadToYoutube";

// =============================================
// 🔹 Types
// =============================================

type RouteContext = {
    params: Promise<{
        courseId: string;
        lectureId: string;
    }>;
};

export interface IVideo {
    public_id?: string | null;
    secure_url?: string | null;
}

export interface IThumbnail {
    public_id?: string | null;
    secure_url?: string | null;
}

export interface ILecture {
    _id?: Types.ObjectId;
    title: string;
    description?: string;
    youtubeLink?: string;
    video?: IVideo;
    thumbnail?: IThumbnail;
}

type CourseDoc = HydratedDocument<ICourse>;

// =============================================
// 🔹 DELETE LECTURE
// =============================================

export const DELETE = withAuth(
    async (
        _req: NextRequest,
        _user: IUser,
        context: RouteContext
    ) => {
        await connectDB();

        try {
            const { courseId, lectureId } = await context.params;

            if (
                !mongoose.isValidObjectId(courseId) ||
                !mongoose.isValidObjectId(lectureId)
            ) {
                return errorResponse(400, "Invalid Id Provided");
            }

            const course = await courseModel.findById(courseId) as CourseDoc | null;

            if (!course) {
                return errorResponse(
                    404,
                    "Course Doesn't Exist With Provided CourseId"
                );
            }

            const lecture = course.lectures.find(
                (lec: ILecture) => lec._id?.toString() === lectureId
            );

            if (!lecture) {
                return errorResponse(
                    400,
                    "Lecture Doesn't Exist For This LectureId"
                );
            }

            // 🔥 Delete YouTube Video
            if (lecture.video?.public_id) {
                try {
                    await deleteVideoFromYoutube(lecture.video.public_id);
                } catch (err) {
                    console.error("Error deleting video from YouTube:", err);
                }
            }

            // 🔥 Remove Lecture
            course.lectures = course.lectures.filter(
                (lec: ILecture) => lec._id?.toString() !== lectureId
            );

            course.noOfLectures = course.lectures.length;

            const updatedCourse = await course.save();

            return successResponse(
                200,
                "Lecture Deleted Successfully",
                updatedCourse
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Deleting Lecture",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    },
    ["INSTRUCTOR", "ADMIN"]
);

// =============================================
// 🔹 UPDATE LECTURE
// =============================================

export const PUT = withAuth(
    async (
        req: NextRequest,
        _user: IUser,
        context: RouteContext
    ) => {
        await connectDB();

        try {
            const { courseId, lectureId } = await context.params;

            if (
                !mongoose.isValidObjectId(courseId) ||
                !mongoose.isValidObjectId(lectureId)
            ) {
                return errorResponse(400, "Invalid Id Provided");
            }

            const course = (await courseModel.findById(
                courseId
            )) as CourseDoc | null;

            if (!course) {
                return errorResponse(400, "Course Doesn't Exist");
            }

            const lecture = course.lectures.find(
                (lec: ILecture) =>
                    lec._id?.toString() === lectureId
            );

            if (!lecture) {
                return errorResponse(400, "Lecture Doesn't Exist");
            }

            const formData = await req.formData();

            const title = formData.get("title");
            const description = formData.get("description");
            const youtubeLink = formData.get("youtubeLink");
            const file = formData.get("video");

            // =================================================
            // 🔹 Update Text Fields
            // =================================================

            if (typeof title === "string") {
                lecture.title = title;

                // Update YouTube title if video exists
                if (lecture.video?.public_id) {
                    try {
                        await updateVideoTitleFromYoutube(
                            lecture.video.public_id,
                            title
                        );
                    } catch (err) {
                        console.error(
                            "Error updating YouTube title:",
                            err
                        );
                    }
                }
            }

            if (typeof description === "string") {
                lecture.description = description;
            }

            if (typeof youtubeLink === "string") {
                lecture.youtubeLink = youtubeLink;
            }

            // =================================================
            // 🔥 If New Video Provided (SERVERLESS SAFE)
            // =================================================

            if (file instanceof File && file.size > 0) {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                const result =
                    await uploadToYoutubeFromBuffer(
                        buffer,
                        typeof title === "string"
                            ? title
                            : lecture.title
                    );

                // 🔥 Delete old YouTube video
                if (lecture.video?.public_id) {
                    try {
                        await deleteVideoFromYoutube(
                            lecture.video.public_id
                        );
                    } catch (err) {
                        console.error(
                            "Error deleting old YouTube video:",
                            err
                        );
                    }
                }

                lecture.video = {
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                };

                // If new video uploaded, remove manual youtubeLink
                lecture.youtubeLink = "";
            }

            const updatedCourse = await course.save();

            return successResponse(
                200,
                "Lecture Updated Successfully",
                updatedCourse
            );
        } catch (error) {
            return errorResponse(
                400,
                "Error In Updating Lecture",
                error instanceof Error
                    ? error.message
                    : "Unknown Error"
            );
        }
    },
    ["INSTRUCTOR", "ADMIN"]
);

