import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import userModel from "@/models/user.model";

export const GET = withAuth(
    async () => {
        try {
            // 🔹 Fetch students
            const students = await userModel.find({
                role: "USER",
            });

            // 🔹 Fetch instructors with populated courses
            const instructors = await userModel
                .find({ role: "INSTRUCTOR" })
                .populate("createdCourses.courseId");

            return successResponse(
                200,
                "Students Fetch Successfully",
                { students, instructors }
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Fetching Students and Instructors",
                (error as Error).message
            );
        }
    },
    ["ADMIN", "INSTRUCTOR"] // 🔥 Role restriction handled by wrapper
);
