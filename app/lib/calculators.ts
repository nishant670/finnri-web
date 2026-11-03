export type SIPPresetID = "mutual_fund" | "ppf" | "nps" | "rd" | "custom";

export type SIPInput = {
    id: SIPPresetID;
    label: string;
    monthlyInvestment: number;
    expectedAnnualReturnPercent: number;
    tenureYears: number;
    annualStepUpPercent: number;
    currentCorpus: number;
};

export type SIPCalculation = SIPInput & {
    investedAmount: number;
    estimatedReturns: number;
    maturityValue: number;
    breakdown: Array<{ year: number; yearlyInvestment: number; yearEndValue: number }>;
};

export type EMIInput = {
    principalAmount: number;
    annualInterestRatePercent: number;
    tenureMonths: number;
};

export type EMICalculation = EMIInput & {
    monthlyEMI: number;
    totalPayment: number;
    totalInterest: number;
    schedule: Array<{
        month: number;
        openingBalance: number;
        paymentAmount: number;
        principalAmount: number;
        interestAmount: number;
        closingBalance: number;
    }>;
};

export const SIP_PRESETS: readonly SIPInput[] = [
    { id: "mutual_fund", label: "Mutual Funds", monthlyInvestment: 10000, expectedAnnualReturnPercent: 12, tenureYears: 10, annualStepUpPercent: 10, currentCorpus: 0 },
    { id: "ppf", label: "PPF", monthlyInvestment: 12500, expectedAnnualReturnPercent: 7, tenureYears: 15, annualStepUpPercent: 0, currentCorpus: 0 },
    { id: "nps", label: "NPS", monthlyInvestment: 10000, expectedAnnualReturnPercent: 10, tenureYears: 20, annualStepUpPercent: 5, currentCorpus: 0 },
    { id: "rd", label: "RD", monthlyInvestment: 5000, expectedAnnualReturnPercent: 6.5, tenureYears: 5, annualStepUpPercent: 0, currentCorpus: 0 },
    { id: "custom", label: "Custom", monthlyInvestment: 10000, expectedAnnualReturnPercent: 8, tenureYears: 10, annualStepUpPercent: 0, currentCorpus: 0 },
];

export type EMIPresetID = "home" | "car" | "personal" | "education";

// Starting points for the public EMI calculator. The rates are illustrative,
// not quotes: lenders price each borrower, so the page asks visitors to put in
// the rate they were offered.
export const EMI_PRESETS: readonly (EMIInput & { id: EMIPresetID; label: string })[] = [
    { id: "home", label: "Home loan", principalAmount: 3000000, annualInterestRatePercent: 8.5, tenureMonths: 240 },
    { id: "car", label: "Car loan", principalAmount: 800000, annualInterestRatePercent: 9.5, tenureMonths: 60 },
    { id: "personal", label: "Personal loan", principalAmount: 300000, annualInterestRatePercent: 12, tenureMonths: 36 },
    { id: "education", label: "Education loan", principalAmount: 1000000, annualInterestRatePercent: 10, tenureMonths: 84 },
];

export const PROJECTION_DISCLAIMER = "Projections are estimates based only on the assumptions provided; they are informational, not forecasts or financial advice.";

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateSIP(input: SIPInput): SIPCalculation {
    const monthlyRate = input.expectedAnnualReturnPercent / 12 / 100;
    const tenureMonths = Math.round(input.tenureYears * 12);
    let value = input.currentCorpus;
    let monthlyInvestment = input.monthlyInvestment;
    let investedAmount = input.currentCorpus;
    const breakdown: SIPCalculation["breakdown"] = [];

    for (let month = 1; month <= tenureMonths; month += 1) {
        value = value * (1 + monthlyRate) + monthlyInvestment;
        investedAmount += monthlyInvestment;

        if (month % 12 === 0 || month === tenureMonths) {
            breakdown.push({
                year: Math.ceil(month / 12),
                yearlyInvestment: monthlyInvestment * (month % 12 === 0 ? 12 : month % 12),
                yearEndValue: value,
            });
            monthlyInvestment *= 1 + input.annualStepUpPercent / 100;
        }
    }

    return { ...input, investedAmount, estimatedReturns: value - investedAmount, maturityValue: value, breakdown };
}

export function validateSIPInput(input: SIPInput) {
    const errors: string[] = [];
    if (!Number.isFinite(input.monthlyInvestment) || input.monthlyInvestment <= 0) errors.push("Monthly investment must be positive.");
    if (!Number.isFinite(input.expectedAnnualReturnPercent) || input.expectedAnnualReturnPercent < 0 || input.expectedAnnualReturnPercent > 100) errors.push("Expected return must be between 0 and 100.");
    if (!Number.isFinite(input.tenureYears) || input.tenureYears <= 0 || input.tenureYears > 60) errors.push("Tenure must be between 1 month and 60 years.");
    if (!Number.isFinite(input.annualStepUpPercent) || input.annualStepUpPercent < 0 || input.annualStepUpPercent > 100) errors.push("Annual step-up must be between 0 and 100.");
    if (!Number.isFinite(input.currentCorpus) || input.currentCorpus < 0) errors.push("Current corpus cannot be negative.");
    return errors;
}

// Keep this in lockstep with finnri-api/internal/http/emi.go. Both calculators
// use paise precision for the instalment and every schedule row, including the
// final principal adjustment. The shared fixture is pinned on both sides.
export function calculateEMI(input: EMIInput): EMICalculation {
    const monthlyRate = input.annualInterestRatePercent / 12 / 100;
    const factor = Math.pow(1 + monthlyRate, input.tenureMonths);
    const monthlyEMI = roundMoney(monthlyRate === 0
        ? input.principalAmount / input.tenureMonths
        : input.principalAmount * monthlyRate * factor / (factor - 1));

    let balance = input.principalAmount;
    let totalPayment = 0;
    let totalInterest = 0;
    const schedule: EMICalculation["schedule"] = [];

    for (let month = 1; month <= input.tenureMonths; month += 1) {
        const openingBalance = balance;
        const interestAmount = roundMoney(openingBalance * monthlyRate);
        let principalAmount = roundMoney(monthlyEMI - interestAmount);
        if (principalAmount <= 0 || principalAmount > balance || month === input.tenureMonths) {
            principalAmount = balance;
        }
        const paymentAmount = roundMoney(principalAmount + interestAmount);
        balance = roundMoney(Math.max(0, balance - principalAmount));
        totalPayment = roundMoney(totalPayment + paymentAmount);
        totalInterest = roundMoney(totalInterest + interestAmount);
        schedule.push({ month, openingBalance, paymentAmount, principalAmount, interestAmount, closingBalance: balance });
        if (balance === 0) break;
    }

    return { ...input, monthlyEMI, totalPayment, totalInterest, schedule };
}

export function validateEMIInput(input: EMIInput) {
    const errors: string[] = [];
    if (!Number.isFinite(input.principalAmount) || input.principalAmount <= 0) errors.push("Loan amount must be positive.");
    if (!Number.isFinite(input.annualInterestRatePercent) || input.annualInterestRatePercent < 0 || input.annualInterestRatePercent > 100) errors.push("Interest rate must be between 0 and 100.");
    if (!Number.isInteger(input.tenureMonths) || input.tenureMonths < 1 || input.tenureMonths > 360) errors.push("Tenure must be between 1 and 360 months.");
    return errors;
}

/** The amortization schedule folded into loan years, for charts and tables. */
export function summarizeEMIByYear(schedule: EMICalculation["schedule"]) {
    const years: Array<{ year: number; principalPaid: number; interestPaid: number; closingBalance: number }> = [];
    for (const row of schedule) {
        const year = Math.ceil(row.month / 12);
        const current = years[year - 1] ?? (years[year - 1] = { year, principalPaid: 0, interestPaid: 0, closingBalance: 0 });
        current.principalPaid = roundMoney(current.principalPaid + row.principalAmount);
        current.interestPaid = roundMoney(current.interestPaid + row.interestAmount);
        current.closingBalance = row.closingBalance;
    }
    return years;
}

/**
 * The SIP breakdown with running totals: what each year's monthly instalment
 * was, what had gone in by year end (current corpus included), and the value.
 */
export function summarizeSIPByYear(result: SIPCalculation) {
    // The last year can be part of a year (say 10.5 years); its instalments
    // still came in at that year's monthly amount.
    const finalMonths = Math.round(result.tenureYears * 12) % 12 || 12;
    return result.breakdown.reduce<Array<{ year: number; monthlyInvestment: number; investedSoFar: number; value: number }>>((years, row, index) => {
        const before = index === 0 ? result.currentCorpus : years[index - 1].investedSoFar;
        const months = index === result.breakdown.length - 1 ? finalMonths : 12;
        years.push({ year: row.year, monthlyInvestment: row.yearlyInvestment / months, investedSoFar: before + row.yearlyInvestment, value: row.yearEndValue });
        return years;
    }, []);
}
