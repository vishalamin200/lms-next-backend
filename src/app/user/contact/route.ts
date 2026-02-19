import { NextRequest } from "next/server";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";

import contactModel from "@/models/contact.model";
import { verifyCaptcha } from "@/utils/verifyCaptcha";
import sendContactMail from "@/utils/sendContactMail";


// ============================================
// 🔹 Types
// ============================================

interface ContactBody {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    captchaToken: string;
}


// ============================================
// 🔹 POST /api/contact
// ============================================

export async function POST(req: NextRequest) {
    await connectDB();

    try {
        const body: ContactBody = await req.json();

        const {
            name,
            email,
            phone,
            subject,
            message,
            captchaToken,
        } = body;

        // 🔹 Check all fields present
        if (
            !name ||
            !email ||
            !phone ||
            !subject ||
            !message ||
            !captchaToken
        ) {
            return errorResponse(
                400,
                "All Fields Are Required"
            );
        }

        // 🔹 Validate Email
        const emailRegex =
            /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

        if (!emailRegex.test(email)) {
            return errorResponse(
                400,
                "Email Is Not Valid",
                "Invalid Email Format"
            );
        }

        // 🔹 Validate Indian Phone Number
        const phoneRegex = /^[6-9]\d{9}$/;

        if (!phoneRegex.test(phone)) {
            return errorResponse(
                400,
                "Provide Valid 10 digit Indian Phone Number",
                "Invalid Phone Number"
            );
        }

        // 🔹 Verify Captcha
        const isHuman = await verifyCaptcha(captchaToken);

        if (!isHuman) {
            return errorResponse(
                400,
                "CAPTCHA Validation Failed!",
                "Failed Captcha validation"
            );
        }

        // 🔹 Save to Database
        await contactModel.create({
            name,
            email,
            phone,
            subject,
            message,
        });

        // 🔹 Send Email to Admin
        try {
            const emailRes = await sendContactMail({
                name,
                email,
                phone,
                subject,
                message,
            });

            if (emailRes?.success) {
                console.log("Contact email sent successfully");
            }

        } catch (mailError) {
            console.error(
                "Error sending contact email:",
                mailError
            );
            // Not blocking user response
        }

        return successResponse(
            200,
            "We have received your message",
            "Message received successfully"
        );

    } catch (error) {
        return errorResponse(
            400,
            "Error in sendUsMessage controller",
            error instanceof Error
                ? error.message
                : "Unknown Error"
        );
    }
}
