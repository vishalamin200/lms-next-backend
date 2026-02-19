interface GoogleCaptchaResponse {
    success: boolean;
    challenge_ts?: string;
    hostname?: string;
    score?: number;
    action?: string;
    "error-codes"?: string[];
}

export async function verifyCaptcha(
    token: string
): Promise<boolean> {
    const secretKey = process.env.CAPTCHA_SECRET_KEY;

    if (!secretKey) {
        throw new Error("CAPTCHA_SECRET_KEY is not defined");
    }

    if (!token) {
        return false;
    }

    const url = "https://www.google.com/recaptcha/api/siteverify";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                secret: secretKey,
                response: token,
            }),
        });

        const data: GoogleCaptchaResponse =
            await response.json();

        return data.success === true;

    } catch (error) {
        console.error(
            "Error verifying Captcha:",
            error instanceof Error ? error.message : error
        );
        throw error;
    }
}
