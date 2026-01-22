import { describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import * as userService from "@/modules/user/user.actions";
import { usersTable } from "@/modules/user/user.dto";
import { db } from "./setup";

describe("User Service (Integration)", () => {
	// -------------------------------------------------------------------------
	// CREATE
	// -------------------------------------------------------------------------
	describe("createUser", () => {
		it("should create a user and store a hashed password", async () => {
			const rawPassword = "securePassword123!";
			const newUserInput = {
				name: faker.person.fullName(),
				email: faker.internet.email(),
				password: rawPassword,
			};

			const createdUser = await userService.createUser(db, newUserInput);

			// 1. Check the returned object structure
			expect(createdUser).not.toBe("EMAIL_EXISTS");
			if (createdUser === "EMAIL_EXISTS") return;

			expect(createdUser.username).toBe(newUserInput.name);
			expect(createdUser.email).toBe(newUserInput.email);
			expect(createdUser).not.toHaveProperty("password");

			// 2. Verify DB contents directly to ensure password is hashed
			const [dbUser] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, createdUser.id));

			expect(dbUser).toBeDefined();
			expect(dbUser.password).not.toBe(rawPassword);
			expect(await Bun.password.verify(rawPassword, dbUser.password)).toBe(
				true,
			);
		});

		it("should return EMAIL_EXISTS on duplicate email", async () => {
			const email = faker.internet.email();
			const input = {
				name: "First User",
				email: email,
				password: "password123",
			};

			// Create first user
			await userService.createUser(db, input);

			// Try to create second user with same email
			const result = await userService.createUser(db, {
				...input,
				name: "Second User", // different name
			});

			expect(result).toBe("EMAIL_EXISTS");
		});
	});

	// -------------------------------------------------------------------------
	// READ
	// -------------------------------------------------------------------------
	describe("getUserById", () => {
		it("should retrieve an existing user", async () => {
			// Seed a user
			const input = {
				name: faker.person.fullName(),
				email: faker.internet.email(),
				password: "123",
			};
			const created = await userService.createUser(db, input);
			if (created === "EMAIL_EXISTS") throw new Error("Setup failed");

			// Fetch
			const fetched = await userService.getUserById(db, created.id);

			expect(fetched).toBeDefined();
			expect(fetched?.id).toBe(created.id);
			expect(fetched?.username).toBe(input.name);
		});

		it("should return undefined for non-existent ID", async () => {
			const fetched = await userService.getUserById(db, 99999);
			expect(fetched).toBeUndefined();
		});
	});

	describe("getAllUsers", () => {
		it("should return all users in the database", async () => {
			// Seed 3 users
			await userService.createUser(db, {
				name: "A",
				email: "a@a.com",
				password: "1",
			});
			await userService.createUser(db, {
				name: "B",
				email: "b@b.com",
				password: "1",
			});
			await userService.createUser(db, {
				name: "C",
				email: "c@c.com",
				password: "1",
			});

			const all = await userService.getAllUsers(db);
			expect(all).toHaveLength(3);
		});
	});

	// -------------------------------------------------------------------------
	// UPDATE
	// -------------------------------------------------------------------------
	describe("updateUser", () => {
		it("should update name without changing password", async () => {
			// Setup
			const rawPass = "originalPass";
			const created = await userService.createUser(db, {
				name: "Old Name",
				email: "update@test.com",
				password: rawPass,
			});
			if (created === "EMAIL_EXISTS") throw new Error("Setup failed");

			// Update
			const updated = await userService.updateUser(db, created.id, {
				name: "New Name",
			});

			expect(updated.username).toBe("New Name");

			// Verify password hash hasn't changed in DB
			const [dbUser] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, created.id));

			expect(await Bun.password.verify(rawPass, dbUser.password)).toBe(true);
		});

		it("should re-hash password if provided in update", async () => {
			// Setup
			const created = await userService.createUser(db, {
				name: "User",
				email: "rehash@test.com",
				password: "oldPassword",
			});
			if (created === "EMAIL_EXISTS") throw new Error("Setup failed");

			// Update with new password
			const newPass = "newSecret123";
			await userService.updateUser(db, created.id, {
				password: newPass,
			});

			// Verify DB has new hash
			const [dbUser] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, created.id));

			expect(await Bun.password.verify(newPass, dbUser.password)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// DELETE
	// -------------------------------------------------------------------------
	describe("deleteUser", () => {
		it("should remove user from database", async () => {
			const created = await userService.createUser(db, {
				name: "To Delete",
				email: "del@test.com",
				password: "123",
			});
			if (created === "EMAIL_EXISTS") throw new Error("Setup failed");

			const deleted = await userService.deleteUser(db, created.id);
			expect(deleted).toEqual({ id: created.id });

			// Confirm it's gone
			const lookup = await userService.getUserById(db, created.id);
			expect(lookup).toBeUndefined();
		});
	});
});
