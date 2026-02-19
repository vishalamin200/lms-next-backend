import { NextRequest } from "next/server";
import crypto from "crypto";
import { razorpay } from "@/lib/services";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import  { IUser } from "@/models/user.model";


// ==============================================
// 🔹 Types
// ==============================================

interface VerifyOrderBody {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    courseId: string;
}


// ==============================================
// 🔹 VERIFY ORDER
// ==============================================

export const POST = withAuth(
    async (req: NextRequest, user: IUser) => {
        await connectDB();

        try {
            const {
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
                courseId,
            }: VerifyOrderBody = await req.json();

            if (
                !razorpay_payment_id ||
                !razorpay_order_id ||
                !razorpay_signature ||
                !courseId
            ) {
                return errorResponse(400, "Invalid Payment Data");
            }

            const subscription = user.subscriptions.find(
                (sub) => sub.courseId === courseId
            );

            if (!subscription) {
                return errorResponse(
                    400,
                    "Payment Is Not Initiated For This Course"
                );
            }

            const orderId = subscription.order_id;

            if (!orderId) {
                return errorResponse(
                    400,
                    "Order Id Missing For This Subscription"
                );
            }

            // =====================================
            // 🔥 Verify Signature
            // =====================================

            const generatedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY as string)
                .update(orderId + "|" + razorpay_payment_id)
                .digest("hex");

            if (generatedSignature !== razorpay_signature) {
                return errorResponse(
                    400,
                    "Payment Verification Failed!"
                );
            }

            // =====================================
            // 🔥 Activate Subscription
            // =====================================

            subscription.subscription_status = "active";

            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 2);

            subscription.purchaseAt = new Date();
            subscription.expiresAt = expiryDate;

            // Fetch payment details from Razorpay
            const paymentDetails = await razorpay.payments.fetch(
                razorpay_payment_id
            );

            subscription.paymentDetails = paymentDetails as unknown as Record<string, unknown>;

            await user.save();

            return successResponse(
                200,
                "Payment Verified Successfully",
                user
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Verifying Order",
                error instanceof Error ? error.message : "Unknown Error"
            );
        }
    }
);
