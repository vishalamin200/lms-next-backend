import { NextRequest } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";

import courseModel, { ICourse } from "@/models/course.model";
import { IUser } from "@/models/user.model";
import { HydratedDocument } from "mongoose";

type CourseDoc = HydratedDocument<ICourse>;

interface UpdateRatingBody {
    userRating: number;
    courseId: string;
}

export const POST = withAuth(
    async (req: NextRequest, user: IUser) => {
        await connectDB();

        try {
            const body: UpdateRatingBody = await req.json();

            const { userRating, courseId } = body;

            // 🔹 Validate Rating
            if (userRating === undefined || userRating === null) {
                return errorResponse(400, "Rating is Required");
            }

            if (userRating < 0 || userRating > 5) {
                return errorResponse(
                    400,
                    "Rating Is Invalid, Rating Must Be Between 0 To 5"
                );
            }

            // 🔹 Validate CourseId
            if (!courseId || !mongoose.isValidObjectId(courseId)) {
                return errorResponse(400, "CourseId Is Invalid");
            }

            const course = await courseModel.findById(courseId) as CourseDoc | null;

            if (!course) {
                return errorResponse(404, "Course Not Found");
            }

            const userId = user._id.toString();

            // 🔹 Check if user already rated
            const existingRating = course.allRatings.find(
                (rating) =>
                    rating.userId.toString() === userId
            );

            if (!existingRating) {
                // 🔥 New Rating
                course.allRatings.push({
                    userId: user._id,
                    value: userRating,
                });

                await course.save();

                return successResponse(
                    200,
                    "Rating Added Successfully",
                    course.allRatings
                );
            }

            // 🔥 Update Existing Rating
            existingRating.value = userRating;

            await course.save();

            return successResponse(
                200,
                "Rating Updated Successfully",
                course.allRatings
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Updating Rating",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    }
);
