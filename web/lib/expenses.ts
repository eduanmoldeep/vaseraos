import { getEnv, mockStore, uid, type Env, type Expense } from "./cloudflare";

async function db(env: Env | null) {
  return env?.DB ?? null;
}

/** Shared insert used both by the treasurer's manual expense form and by anything that logs a society spend on its own (e.g. a guard salary payment). */
export async function createExpense(input: {
  societyId: string;
  category: string;
  vendor: string;
  amount: number;
  description?: string | null;
  receiptKey?: string | null;
  createdBy?: string | null;
  guardSalaryPaymentId?: string | null;
}): Promise<Expense> {
  const expense: Expense = {
    id: uid("e"),
    society_id: input.societyId,
    category: input.category,
    vendor: input.vendor,
    amount: input.amount,
    description: input.description ?? null,
    receipt_key: input.receiptKey ?? null,
    created_by: input.createdBy ?? null,
    guard_salary_payment_id: input.guardSalaryPaymentId ?? null,
    created_at: new Date().toISOString(),
  };
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    await conn.prepare(
      "INSERT INTO expenses (id, society_id, category, vendor, amount, description, receipt_key, created_by, guard_salary_payment_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      expense.id, expense.society_id, expense.category, expense.vendor, expense.amount,
      expense.description, expense.receipt_key, expense.created_by, expense.guard_salary_payment_id, expense.created_at
    ).run();
  } else {
    mockStore().expenses.push(expense);
  }
  return expense;
}
