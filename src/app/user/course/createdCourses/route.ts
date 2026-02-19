import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import connectDB from "@/lib/db";
import courseModel from "@/models/course.model";

export const GET = withAuth(async (_req, user) => {
    await connectDB();

    try {
        const creatorEmail = user?.email;

        const courses = await courseModel.find({
            creatorEmail,
        });

        return successResponse(
            200,
            "Fetched Created Courses Successfully",
            courses
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error In Fetching Created Courses",
            (error as Error).message
        );
    }
});
