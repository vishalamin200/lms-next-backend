import { NextRequest } from "next/server";
import { razorpay } from "@/lib/services";
import { withAuth } from "@/lib/withAuth";
import { successResponse, errorResponse } from "@/lib/apiResponse";


// ==========================================
// 🔹 Razorpay Setup
// ==========================================



// ==========================================
// 🔹 Stable Razorpay Payment Types
// ==========================================

interface RazorpayPayment {
    id: string;
    amount: number;
    currency: string;
    status: string;
    method?: string;
    notes?: Record<string, unknown>;
    created_at: number;
}

interface RazorpayPaymentsResponse {
    items: RazorpayPayment[];
}

// ==========================================
// 🔹 Request Body Type
// ==========================================

interface FetchPaymentsBody {
    year: number;
}

interface MonthlyPayments {
    [month: string]: RazorpayPayment[];
}

interface MonthlyTotals {
    [month: string]: number;
}

// ==========================================
// 🔹 Fetch All Payments With Pagination
// ==========================================

async function fetchAllPaymentsForRange(
    from: number,
    to: number
): Promise<RazorpayPayment[]> {
    const allPayments: RazorpayPayment[] = [];
    const count = 100;
    let skip = 0;

    while (true) {
        const response = await razorpay.payments.all({
            from,
            to,
            count,
            skip,
        }) as RazorpayPaymentsResponse;

        const items = response.items ?? [];

        allPayments.push(...items);

        if (items.length < count) break;

        skip += count;
    }

    return allPayments;
}

// ==========================================
// 🔹 Route Handler
// ==========================================

export const POST = withAuth(
    async (req: NextRequest) => {
        try {
            const body = (await req.json()) as Partial<FetchPaymentsBody>;
            const year = Number(body.year);

            if (
                !Number.isInteger(year) ||
                year < 2000 ||
                year > 3000
            ) {
                return errorResponse(400, "Valid Year Is Required");
            }

            const monthNames = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            ] as const;

            const paymentsByMonth: MonthlyPayments = {};
            const totalAmountsByMonth: MonthlyTotals = {};
            let yearlyTotalInPaise = 0;

            for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
                const startDate = new Date(year, monthIndex, 1, 0, 0, 0);
                const nextMonthStartDate = new Date(
                    year,
                    monthIndex + 1,
                    1,
                    0,
                    0,
                    0
                );

                const from = Math.floor(startDate.getTime() / 1000);
                const to =
                    Math.floor(nextMonthStartDate.getTime() / 1000) - 1;

                const payments = await fetchAllPaymentsForRange(
                    from,
                    to
                );

                const totalAmountForMonthInPaise = payments.reduce(
                    (sum: number, payment: RazorpayPayment) =>
                        sum + (payment.amount ?? 0),
                    0
                );

                const monthKey = monthNames[monthIndex];

                paymentsByMonth[monthKey] = payments;
                totalAmountsByMonth[monthKey] =
                    totalAmountForMonthInPaise / 100;

                yearlyTotalInPaise += totalAmountForMonthInPaise;
            }

            return successResponse(
                200,
                "Fetched All Payments Successfully",
                {
                    paymentsByMonth,
                    totalAmountsByMonth,
                    yearlyTotal: yearlyTotalInPaise / 100,
                }
            );
        } catch (error) {
            return errorResponse(
                400,
                "Error In Fetching All Payments",
                error instanceof Error
                    ? error.message
                    : "Unknown Error"
            );
        }
    },
    ["ADMIN"]
);
