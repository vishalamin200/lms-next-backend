import { NextRequest } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import  { IUser } from "@/models/user.model";

interface VerifySubscriptionBody {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
    courseId: string;
}

export const POST = withAuth(
    async (req: NextRequest, user: IUser) => {
        await connectDB();

        try {
            const {
                razorpay_payment_id,
                razorpay_signature,
                courseId,
            }: VerifySubscriptionBody = await req.json();

            if (!courseId) {
                return errorResponse(400, "CourseId Is Not Provided");
            }

            const subscription = user.subscriptions?.find(
                (sub) => sub.courseId === courseId
            );

            if (!subscription) {
                return errorResponse(
                    400,
                    "No Subscription Exists For This Course"
                );
            }

            const subscriptionId = subscription.subscription_id;

            if (!subscriptionId) {
                return errorResponse(
                    400,
                    "Subscription Id Missing"
                );
            }

            // 🔥 Verify Signature
            const generatedSignature = crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_SECRET as string
                )
                .update(
                    `${razorpay_payment_id}|${subscriptionId}`
                )
                .digest("hex");

            if (generatedSignature !== razorpay_signature) {
                return errorResponse(
                    400,
                    "Payment Verification Failed! Please Retry"
                );
            }

            subscription.subscription_status = "active";
            await user.save();

            return successResponse(
                200,
                "Payment Verified Successfully",
                user
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Verification Of Subscription",
                error instanceof Error
                    ? error.message
                    : "Unknown Error"
            );
        }
    }
);
