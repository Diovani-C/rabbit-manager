import { eq } from "drizzle-orm";
import type { Database } from "@/types";
import {
	type EmailExists,
	type UserInsertSchema,
	type UserUpdateSchema,
	usersTable,
} from "./user.dto";

// This ensures we NEVER accidentally return the password hash.
const safeColumns = {
	id: usersTable.id,
	username: usersTable.name,
	email: usersTable.email,
};

/**
 * CREATE (One)
 * - Returns one safe user object or EmailExists error.
 */
export async function createUser(db: Database, newUser: UserInsertSchema) {
	const hashedPassword = await Bun.password.hash(newUser.password);

	try {
		const [createdUser] = await db
			.insert(usersTable)
			.values({
				...newUser,
				password: hashedPassword,
			})
			.returning(safeColumns);

		return createdUser;
	} catch (error: any) {
		if (error?.code === "23505") {
			if (
				error.constraint_name?.includes("email") ||
				error.detail?.includes("email")
			) {
				return "EMAIL_EXISTS" satisfies EmailExists;
			}
		}
		throw error;
	}
}

/**
 * READ (All)
 * - Returns a list of safe user objects.
 */
export async function getAllUsers(db: Database) {
	return db.select(safeColumns).from(usersTable);
}

/**
 * READ (One)
 * - Returns one safe user object or undefined.
 */
export async function getUserById(db: Database, id: number) {
	const [user] = await db
		.select(safeColumns)
		.from(usersTable)
		.where(eq(usersTable.id, id))
		.limit(1);

	return user;
}

/**
 * UPDATE
 * - Accepts PARTIAL data (e.g., just changing username).
 * - Re-hashes password ONLY if it is being updated.
 */
export async function updateUser(
	db: Database,
	id: number,
	updateData: UserUpdateSchema,
) {
	// If password is provided, hash it. Otherwise, keep existing.
	const dataToUpdate = { ...updateData };

	if (dataToUpdate.password) {
		dataToUpdate.password = await Bun.password.hash(dataToUpdate.password);
	}

	const [updatedUser] = await db
		.update(usersTable)
		.set(dataToUpdate)
		.where(eq(usersTable.id, id))
		.returning(safeColumns);

	return updatedUser;
}

/**
 * DELETE
 * - Returns the ID of the deleted user for confirmation.
 */
export async function deleteUser(db: Database, id: number) {
	const [deleted] = await db
		.delete(usersTable)
		.where(eq(usersTable.id, id))
		.returning({ id: usersTable.id });

	return deleted;
}
