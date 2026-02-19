import { NextRequest } from "next/server";
import { razorpay } from "@/lib/services";
import mongoose from "mongoose";

import { errorResponse, successResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";
import { withAuth } from "@/lib/withAuth";

import courseModel from "@/models/course.model";
import  { IUser } from "@/models/user.model";





// ==============================================
// 🔹 Types
// ==============================================

interface CreateOrderBody {
    courseId: string;
}

type SubscriptionStatus =
    | "created"
    | "active"
    | "cancelled"
    | string;


// ==============================================
// 🔹 CREATE ORDER
// ==============================================

export const POST = withAuth(
    async (req: NextRequest, user: IUser) => {

        await connectDB();

        try {
            const { courseId }: CreateOrderBody =
                await req.json();

            if (!courseId || !mongoose.isValidObjectId(courseId)) {
                return errorResponse(400, "Invalid CourseId");
            }

            const course = await courseModel.findById(courseId);

            if (!course) {
                return errorResponse(
                    404,
                    "No Course Exists With Provided Course Id"
                );
            }

            // 🔥 Role restriction
            if (user.role === "ADMIN" || user.role === "INSTRUCTOR") {
                return errorResponse(
                    400,
                    "You Are Not Allowed To Purchase Course"
                );
            }

            // Ensure subscriptions array exists
            if (!user.subscriptions) {
                user.subscriptions = [];
            }

            // 🔹 Check existing subscription
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

            // 🔹 Calculate final price
            const coursePrice = course.price ?? 0;
            const discount = course.discount ?? 0;

            const finalPrice = Math.trunc(
                coursePrice - (discount * coursePrice) / 100
            );

            // ======================================
            // 🔥 FREE COURSE LOGIC
            // ======================================

            if (finalPrice === 0) {
                const expiryDate = new Date();
                expiryDate.setFullYear(
                    expiryDate.getFullYear() + 2
                );

                user.subscriptions.push({
                    courseId,
                    courseTitle: course.topic,
                    subscription_status: "active",
                    purchaseAt: new Date(),
                    expiresAt: expiryDate,
                    paymentDetails: {
                        amount: 0,
                        userName: user.fullName,
                        userEmail: user.email,
                    },
                });

                await user.save();

                return successResponse(
                    200,
                    "Enrolled Successfully",
                    "Free"
                );
            }

            // ======================================
            // 🔥 PAID COURSE LOGIC
            // ======================================

            const order = await razorpay.orders.create({
                amount: finalPrice * 100, // Razorpay expects paise
                currency: "INR",
                receipt: `order_receipt_${courseId}`,
                notes: {
                    courseId,
                    courseTitle: course.topic,
                    finalPrice,
                    userName: user.fullName,
                    userEmail: user.email,
                },
            });

            const paymentDetails = {
                courseId,
                courseTitle: course.topic,
                order_id: order.id,
                subscription_status: order.status as SubscriptionStatus,
            };

            if (
                existingSubscription &&
                existingSubscription.subscription_status === "created"
            ) {
                existingSubscription.order_id = order.id;
            } else {
                user.subscriptions.push(paymentDetails);
            }

            await user.save();

            return successResponse(
                200,
                "Order Created Successfully",
                order
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Creating Order",
                error instanceof Error
                    ? error.message
                    : "Unknown Error"
            );
        }
    }
);
