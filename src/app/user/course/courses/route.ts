import { NextRequest } from "next/server";
import connectDB from "@/lib/db";
import courseModel from "@/models/course.model";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
    await connectDB();

    try {
        const { category, courseName } = await req.json();

        // 🔹 Search by Category
        if (category) {
            const coursesList = await courseModel.find({ category });

            const formattedName = category
                .replace(/-/g, " ")
                .replace(/\b\w/g, (char: string) =>
                    char.toUpperCase()
                );

            if (coursesList.length > 0) {
                return successResponse(
                    200,
                    `Explore Our ${formattedName} Courses`,
                    { Course: coursesList }
                );
            } else {
                return successResponse(
                    200,
                    "Currently We Don't Have Any Course For This Category"
                );
            }
        }

        // 🔹 Search by Course Name
        if (courseName) {
            const course = await courseModel.find({
                topic: courseName,
            });

            if (course.length > 0) {
                return successResponse(
                    200,
                    `Here Is Your ${courseName} Course`,
                    { Course: course }
                );
            } else {
                return successResponse(
                    200,
                    "Currently We Don't Have Any Course For This Course Name"
                );
            }
        }

        // 🔹 If neither provided
        return errorResponse(
            400,
            "No Category Or Course Name Provided"
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error In Get Courses By Category Or Name",
            (error as Error).message
        );
    }
}
