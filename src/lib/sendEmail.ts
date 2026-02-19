import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// =============================
// 🔹 Read HTML Template
// =============================

function getHtmlContent(userName: string, resetLink: string): string {
    const filePath = path.join(
        process.cwd(),
        "src",
        "templates",
        "passwordReset.html"
    );

    let htmlContent = fs.readFileSync(filePath, "utf8");

    htmlContent = htmlContent
        .replace("[User]", userName)
        .replace("[reset_link]", resetLink);

    return htmlContent;
}

// =============================
// 🔹 Nodemailer Transporter
// =============================

const transporter = nodemailer.createTransport({
    host: "smtp.zoho.in",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_EMAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: true,
    },
});

// =============================
// 🔹 Send Reset Email Function
// =============================

export default async function sendResetEmail(
    userId: string,
    userEmail: string,
    userName: string,
    token: string
): Promise<void> {
    try {
        const resetPasswordLink = `${process.env.CLIENT_URL}/auth/resetPassword/${userId}/${token}`;

        const htmlContent = getHtmlContent(
            userName,
            resetPasswordLink
        );

        const info = await transporter.sendMail({
            from: `"CodeAcademy" <${process.env.SENDER_EMAIL}>`,
            to: userEmail,
            replyTo: process.env.SENDER_EMAIL,
            subject: "Reset Your Password",
            html: htmlContent,
        });

        console.log("Email sent successfully:", info.response);

    } catch (error) {
        console.error(
            "Error in Sending Mail:",
            (error as Error).message
        );
        throw error; // important so API route can handle cleanup
    }
}
