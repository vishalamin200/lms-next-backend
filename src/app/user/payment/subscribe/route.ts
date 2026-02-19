import { errorResponse, successResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { IUser } from "@/models/user.model";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { razorpay } from "@/lib/services";


// ==============================================
// 🔹 Razorpay Instance
// ==============================================



// ==============================================
// 🔹 Types
// ==============================================

interface SubscribeBody {
    courseId: string;
}


// ==============================================
// 🔹 CREATE SUBSCRIPTION
// ==============================================

export const POST = withAuth(
    async (req: NextRequest, user: IUser) => {
        await connectDB();

        try {
            const { courseId }: SubscribeBody = await req.json();

            if (!courseId || !mongoose.isValidObjectId(courseId)) {
                return errorResponse(400, "Invalid Course Id");
            }

            if (user.role === "ADMIN" || user.role === "INSTRUCTOR") {
                return errorResponse(
                    400,
                    "You Are Not Allowed To Purchase Subscription"
                );
            }

            if (!user.subscriptions) {
                user.subscriptions = [];
            }

            const existingSubscription = user.subscriptions.find(
                (sub) => sub.courseId === courseId
            );

            if (
                existingSubscription &&
                existingSubscription.subscription_status === "active"
            ) {
                return successResponse(
                    200,
                    "You Have Already Purchased The Course",
                    courseId
                );
            }

            // =====================================
            // 🔥 Subscription Dates (2 Years)
            // =====================================

            const startDate = new Date();
            const twoYearsLater = new Date(startDate);
            twoYearsLater.setFullYear(startDate.getFullYear() + 2);

            const startAt = Math.floor(startDate.getTime() / 1000) + 300;
            
            const subscription = await razorpay.subscriptions.create({
                plan_id: process.env.RAZORPAY_PLAN_ID as string,
                customer_notify: 1,
                start_at: startAt,
                total_count: 24, // e.g., 24 for 24 months (2 years), adjust as needed
            });

            const subscriptionDetails = {
                courseId,
                subscription_id: subscription.id,
                subscription_status: subscription.status,
            };

            if (
                existingSubscription &&
                existingSubscription.subscription_status === "created"
            ) {
                existingSubscription.subscription_id = subscription.id;
            } else {
                user.subscriptions.push(subscriptionDetails);
            }

            await user.save();

            return successResponse(
                200,
                "Subscription Created Successfully",
                subscription
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Creating Subscription",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    }
);
