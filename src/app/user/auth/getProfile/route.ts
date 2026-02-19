import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/withAuth";

export const GET = withAuth(async (req, user) => {
    try {
        // Remove sensitive / unwanted fields
        const {
            password,
            createdCourses,
            subscriptions,
            ...filteredUser
        } = user.toObject();

        return successResponse(
            200,
            "Get Profile Successfully",
            filteredUser
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error Getting User Profile",
            (error as Error).message
        );
    }
});
