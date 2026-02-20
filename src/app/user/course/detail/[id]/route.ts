import { errorResponse, successResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";

import courseModel from "@/models/course.model";

import mongoose from "mongoose";
import { NextRequest } from "next/server";


export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        await connectDB();

        try {
            const { id: courseId } = await params;

            if (!mongoose.isValidObjectId(courseId)) {
                return errorResponse(400, `Invalid Course Id : ${courseId}`, );
            }

            const course = await courseModel.findById(courseId);

            if (!course) {
                return errorResponse(400, "No Course Exist for Provided CourseId");
            }

            return successResponse(
                200,
                "Course Fetch Successfully",
                course
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Fetching Course",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    };