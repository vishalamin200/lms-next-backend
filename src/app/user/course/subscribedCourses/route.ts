import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import connectDB from "@/lib/db";
import courseModel from "@/models/course.model";

export const GET = withAuth(async (_req, user) => {
    await connectDB();

    try {
        // 🔹 Get active subscription course IDs
        const courseIdList =
            user?.subscriptions
                ?.filter(
                    (sub) =>
                        sub.subscription_status?.toLowerCase() ===
                        "active"
                )
                .map((sub) => sub.courseId) || [];

        // 🔹 Fetch subscribed courses
        const subscribedCourses = await courseModel.find({
            _id: { $in: courseIdList },
        });

        return successResponse(
            200,
            "Fetch Subscribed Courses Successfully",
            subscribedCourses
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error In Fetching Subscribed Courses",
            (error as Error).message
        );
    }
});
