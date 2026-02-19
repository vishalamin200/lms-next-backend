import { NextRequest } from "next/server";
import { razorpay } from "@/lib/services";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import { IUser } from "@/models/user.model";


export const POST = withAuth(
    async (_req: NextRequest, user: IUser) => {
        await connectDB();

        try {
            if (user.role === "ADMIN" || user.role === "INSTRUCTOR") {
                return errorResponse(
                    400,
                    "You Are Not Allowed To Unsubscribe"
                );
            }

            const activeSubscription = user.subscriptions?.find(
                (sub) => sub.subscription_status === "active"
            );

            if (!activeSubscription?.subscription_id) {
                return errorResponse(
                    400,
                    "Active Subscription Not Found"
                );
            }

            const cancelSub =
                await razorpay.subscriptions.cancel(
                    activeSubscription.subscription_id
                );

            activeSubscription.subscription_status =
                cancelSub.status;

            await user.save();

            return successResponse(
                200,
                "Unsubscribed Successfully",
                cancelSub
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Cancelling Subscription",
                error instanceof Error
                    ? error.message
                    : "Unknown Error"
            );
        }
    }
);
