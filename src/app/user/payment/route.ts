import { NextRequest } from "next/server";
import { razorpay } from "@/lib/services";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";




export const GET = withAuth(
    async (req: NextRequest) => {
        await connectDB();

        try {
            const { searchParams } = new URL(req.url);

            const count = Number(searchParams.get("count")) || 20;
            const skip = Number(searchParams.get("skip")) || 0;

            const subscriptions = await razorpay.subscriptions.all({
                count,
                skip,
            });

            return successResponse(
                200,
                "All Subscriptions Fetched Successfully",
                subscriptions
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Fetching All Subscriptions",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    },
    ["ADMIN"]
);
