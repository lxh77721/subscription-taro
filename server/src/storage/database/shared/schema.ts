import { pgTable, timestamp, varchar, integer, bigint, doublePrecision, index, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
	id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

/** 到期提醒（订阅消息推送任务）。列名 snake_case，与数据库一致。 */
export const reminders = pgTable(
	"reminders",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		openid: varchar("openid", { length: 64 }).notNull(),
		/** 前端订阅本地记录 id，用于幂等去重 */
		subscriptionId: varchar("subscription_id", { length: 64 }).notNull(),
		/** 提醒下发时间（带时区时间戳） */
		remindAt: timestamp("remind_at", { withTimezone: true, mode: 'string' }).notNull(),
		/** 实际到期日期 YYYY-MM-DD */
		dueDate: varchar("due_date", { length: 10 }).notNull(),
		name: varchar("name", { length: 20 }).notNull(),
		amount: varchar("amount", { length: 16 }).notNull().default("0"),
		page: varchar("page", { length: 128 }).notNull().default("pages/index/index"),
		templateId: varchar("template_id", { length: 64 }),
		/** pending 待发送 / sent 已发送 / failed 死信 */
		status: varchar("status", { length: 16 }).notNull().default("pending"),
		retryCount: integer("retry_count").notNull().default(0),
		lastError: varchar("last_error", { length: 300 }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
		sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	},
	(table) => [
		index("reminders_due_idx").on(table.remindAt, table.status),
		index("reminders_openid_idx").on(table.openid),
	]
);

/** 用户订阅（按 openid 隔离）。列名 snake_case，与数据库一致。 */
export const subscriptions = pgTable(
	"subscriptions",
	{
		/** 前端本地生成的订阅 id */
		id: varchar("id", { length: 64 }).primaryKey(),
		openid: varchar("openid", { length: 64 }).notNull(),
		name: varchar("name", { length: 40 }).notNull(),
		emoji: varchar("emoji", { length: 8 }),
		/** 单期金额 */
		amount: doublePrecision("amount").notNull().default(0),
		/** 周期类型：month / quarter / year / oneTime / custom / free */
		planType: varchar("plan_type", { length: 16 }).notNull(),
		customNum: integer("custom_num"),
		customUnit: varchar("custom_unit", { length: 8 }),
		/** 首次扣费日 YYYY-MM-DD */
		startDate: varchar("start_date", { length: 10 }).notNull(),
		/** 结束日 YYYY-MM-DD（可空 = 长期有效） */
		endDate: varchar("end_date", { length: 10 }),
		remindDays: integer("remind_days").notNull().default(0),
		/** 分类：video / ai / cloud / shopping / reading / game / security */
		category: varchar("category", { length: 16 }).notNull(),
		domain: varchar("domain", { length: 64 }),
		payment: varchar("payment", { length: 40 }),
		/** active / paused / cancelled */
		status: varchar("status", { length: 16 }).notNull().default("active"),
		note: varchar("note", { length: 200 }),
		createdAt: bigint("created_at", { mode: 'number' }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	},
	(table) => [
		index("subscriptions_openid_idx").on(table.openid),
	]
);

/** 订阅行类型（snake_case，与数据库一致） */
export interface SubscriptionRow {
	id: string;
	openid: string;
	name: string;
	emoji: string | null;
	amount: number;
	planType: string;
	customNum: number | null;
	customUnit: string | null;
	startDate: string;
	endDate: string | null;
	remindDays: number;
	category: string;
	domain: string | null;
	payment: string | null;
	status: string;
	note: string | null;
	createdAt: number;
	updatedAt: string;
}

/** 提醒行类型 */
export interface ReminderRow {
	id: string;
	openid: string;
	subscriptionId: string;
	remindAt: string;
	dueDate: string;
	name: string;
	amount: string;
	page: string;
	templateId: string | null;
	status: string;
	retryCount: number;
	lastError: string | null;
	createdAt: string;
	sentAt: string | null;
}

/** 用户资料与偏好配置（按 openid 隔离；settings 为 jsonb，存小程序设置） */
export const userProfiles = pgTable("user_profiles", {
	openid: varchar("openid", { length: 64 }).primaryKey(),
	nickname: varchar("nickname", { length: 40 }).notNull().default(""),
	/** 头像（微信头像填写能力得到的本地或远程地址） */
	avatarUrl: varchar("avatar_url", { length: 500 }),
	/** 小程序设置：预算 / 分类 / 支付方式 / 提醒偏好等 */
	settings: jsonb("settings").$type<Record<string, unknown>>(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

/** 用户资料行类型 */
export interface UserProfileRow {
	openid: string;
	nickname: string;
	avatarUrl: string | null;
	settings: Record<string, unknown> | null;
	updatedAt: string;
}

/** 插入提醒类型 */
export type ReminderInsert = {
	openid: string;
	subscriptionId: string;
	remindAt: string;
	dueDate: string;
	name: string;
	amount: string;
	page: string;
	templateId?: string | null;
	retryCount?: number;
};
