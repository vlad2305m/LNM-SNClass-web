//import 'server-only';
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  index,
  int,
  float,
  mysqlTableCreator,
  primaryKey,
  text,
  timestamp,
  time,
  varchar,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = mysqlTableCreator((name) => `lnm-snclass-web_${name}`);

export const posts = createTable(
  "post",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    name: varchar("name", { length: 256 }),
    createdById: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at").onUpdateNow(),
  },
  (example) => ({
    createdByIdIdx: index("created_by_idx").on(example.createdById),
    nameIndex: index("name_idx").on(example.name),
  })
);

export const model_fits = createTable(
  "model_fits",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    transient: varchar("transient", { length: 127 }).notNull().default(""),
    n_points: int("n").notNull().default(0),
    model: varchar("model", { length: 127 }).notNull().default(""),
    status: mysqlEnum('status', ['pending', 'done', 'error']).notNull().default("error"),

    z: float("z").notNull().default(0),
    t0: float("t0").notNull().default(0),
    amplitude: float("A").notNull().default(0),
    x0: float("x0").notNull().default(0),
    x1: float("x1").notNull().default(0),
    c: float("c").notNull().default(0),

    z_err: float("z_err").notNull().default(0),
    t0_err: float("t0_err").notNull().default(0),
    amplitude_err: float("A_err").notNull().default(0),
    x0_err: float("x0_err").notNull().default(0),
    x1_err: float("x1_err").notNull().default(0),
    c_err: float("c_err").notNull().default(0),

    logl: float("logl").notNull().default(0),
    logz: float("logz").notNull().default(0),
    logl_err: float("logl_err").notNull().default(0),
    logz_err: float("logz_err").notNull().default(0),

    time_spent: time('time', { fsp: 2 }).notNull().default("00:00:00.00"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at").onUpdateNow(),
  }
);






export const CAN_COMPUTE_TRANSIENT = 10;

export const users = createTable(
  "user", 
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: timestamp("email_verified", {
      mode: "date",
      fsp: 3,
    }).default(sql`CURRENT_TIMESTAMP(3)`),
    perm: int("lvl").default(0).notNull(),
    image: varchar("image", { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accounts = createTable(
  "z_account",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_user_id_idx").on(account.userId),
  })
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "z_session",
  {
    sessionToken: varchar("session_token", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_user_id_idx").on(session.userId),
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
