import assert from "node:assert/strict";
import test from "node:test";
import { calculateEMI, calculateSIP, EMI_PRESETS, SIP_PRESETS, summarizeEMIByYear, summarizeSIPByYear } from "./calculators";

test("EMI matches the backend fixture at paise precision", () => {
    const result = calculateEMI({
        principalAmount: 100000,
        annualInterestRatePercent: 12,
        tenureMonths: 12,
    });

    assert.equal(result.monthlyEMI, 8884.88);
    assert.equal(result.totalPayment, 106618.53);
    assert.equal(result.totalInterest, 6618.53);
    assert.equal(result.schedule.length, 12);
    assert.deepEqual(result.schedule[0], {
        month: 1,
        openingBalance: 100000,
        paymentAmount: 8884.88,
        principalAmount: 7884.88,
        interestAmount: 1000,
        closingBalance: 92115.12,
    });
    assert.equal(result.schedule.at(-1)?.closingBalance, 0);
});

test("zero-interest EMI pays exactly the principal", () => {
    const result = calculateEMI({ principalAmount: 12000, annualInterestRatePercent: 0, tenureMonths: 12 });
    assert.equal(result.monthlyEMI, 1000);
    assert.equal(result.totalPayment, 12000);
    assert.equal(result.totalInterest, 0);
});

test("the shared SIP preset produces a stable projection", () => {
    const result = calculateSIP(SIP_PRESETS[0]);
    assert.equal(result.breakdown.length, 10);
    assert.equal(Math.round(result.investedAmount), 1912491);
    assert.equal(Math.round(result.maturityValue), 3340917);
});

test("EMI years add back up to the loan and its interest", () => {
    const result = calculateEMI(EMI_PRESETS[1]);
    const years = summarizeEMIByYear(result.schedule);
    assert.equal(years.length, 5);
    const principal = years.reduce((sum, year) => sum + year.principalPaid, 0);
    const interest = years.reduce((sum, year) => sum + year.interestPaid, 0);
    assert.ok(Math.abs(principal - EMI_PRESETS[1].principalAmount) < 0.05);
    assert.ok(Math.abs(interest - result.totalInterest) < 0.05);
    assert.equal(years[4].closingBalance, 0);
});

test("a partial final year is its own row", () => {
    const years = summarizeEMIByYear(calculateEMI({ principalAmount: 100000, annualInterestRatePercent: 12, tenureMonths: 18 }).schedule);
    assert.deepEqual(years.map((year) => year.year), [1, 2]);
});

test("SIP years carry running totals and the stepped-up instalment", () => {
    const result = calculateSIP({ ...SIP_PRESETS[0], tenureYears: 2.5, currentCorpus: 50000 });
    const years = summarizeSIPByYear(result);
    assert.equal(years.length, 3);
    assert.equal(years[0].monthlyInvestment, 10000);
    assert.ok(Math.abs(years[1].monthlyInvestment - 11000) < 1e-6);
    assert.ok(Math.abs(years[2].monthlyInvestment - 12100) < 1e-6);
    assert.ok(Math.abs(years[2].investedSoFar - result.investedAmount) < 1e-6);
    assert.equal(years[2].value, result.maturityValue);
});
