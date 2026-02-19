import { NextRequest } from "next/server";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";
import { IUser } from "@/models/user.model";

interface PaymentHistoryItem {
    courseId?: string;
    purchaseAt?: Date;
    expiresAt?: Date;
    status?: string;
    amount?: number;
    paymentMethod?: string;
    courseTitle?: string;
    notes?: unknown;
}

export const GET = withAuth(
    async (_req: NextRequest, user: IUser) => {
        await connectDB();

        try {
            const subscriptions = user.subscriptions ?? [];

            const paymentHistory: PaymentHistoryItem[] =
                subscriptions
                    .filter(
                        (sub) =>
                            sub.subscription_status !== "created"
                    )
                    .map((sub) => ({
                        courseId: sub.courseId,
                        purchaseAt: sub.purchaseAt,
                        expiresAt: sub.expiresAt,
                        status: sub.subscription_status,
                        amount: typeof sub.paymentDetails?.amount === "number" ? sub.paymentDetails.amount : undefined,
                        paymentMethod:
                            typeof sub.paymentDetails?.method === "string" ? sub.paymentDetails.method : undefined,
                        courseTitle: sub.courseTitle,
                        notes: sub.paymentDetails?.notes,
                    }));

            return successResponse(
                200,
                "Payment History Fetched Successfully",
                paymentHistory
            );

        } catch (error) {
            return errorResponse(
                400,
                "Error In Fetching Payment History",
                error instanceof Error
                    ? error.message
                    : "Unknown Error"
            );
        }
    }
);
