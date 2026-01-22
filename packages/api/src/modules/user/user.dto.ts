import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";
import { usersTable } from "@/db/schema";

export const userSelectSchema = createSelectSchema(usersTable);
export const userInsertSchema = createInsertSchema(usersTable, {
	name: t.String({ minLength: 2 }),
	email: t.String({ format: "email" }),
});
export const UserUpdateSchema = t.Partial(userInsertSchema);
export const UserResponseSchema = createSelectSchema(usersTable, {
	password: t.Optional(t.String()), // Mark optional so we can strip it
});

export type UserSelectSchema = typeof userSelectSchema.static;
export type UserInsertSchema = typeof userInsertSchema.static;
export type UserUpdateSchema = typeof UserUpdateSchema.static;
export type UserResponse = Omit<typeof UserResponseSchema.static, "password">;

export const emailExists = t.Literal("EMAIL_EXISTS");
export type EmailExists = typeof emailExists.static;

export { usersTable };
