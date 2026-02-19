import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET() {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;

        if (!keyId) {
            return errorResponse(
                500,
                "Razorpay Key Not Configured"
            );
        }

        return successResponse(
            200,
            "KeyId Fetched",
            keyId
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error in Getting Key Id",
            error instanceof Error ? error.message : "Unknown Error"
        );
    }
}
