import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";
import userModel from "@/models/user.model";

export async function POST(request: NextRequest) {
    await connectDB();

    try {
        const { email, password } = await request.json();

        // 🔹 Validation
        if (!email || !password) {
            return errorResponse(400, "Missing Email or Password");
        }

        // 🔹 Find user
        const user = await userModel
            .findOne({ email })
            .select("+password");

        if (!user) {
            return errorResponse(400, "Email is Not Registered");
        }

        // 🔹 Compare password
        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            return errorResponse(400, "Invalid Credentials");
        }

        // 🔹 Generate JWT
        const userToken = user.generateJwtToken();

        // 🔥 Cross-site Cookie Setup
        (await cookies()).set({
            name: "token",
            value: userToken,
            httpOnly: true,
            secure: true,              // REQUIRED for sameSite: "none"
            sameSite: "none",
            path: "/",
            maxAge: 60 * 60 * 24 * 3,   // 3 days (seconds)
        });

        // 🔹 Remove password before sending
        const userObj = user.toObject();
        const { password: _, ...userWithoutPassword } = userObj;

        return successResponse(
            200,
            "LoggedIn Successfully",
            userWithoutPassword
        );

    } catch (err) {
        return errorResponse(
            400,
            "Error in Loggedin",
            (err as Error).message
        );
    }
}
