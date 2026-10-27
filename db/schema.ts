import { index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { ChatMessage } from '../src/lib/chat-history';

export const chats = pgTable('chats', {
  browser: text('browser').notNull(),
  id: uuid('id').notNull(),
  title: text('title').notNull(),
  messages: jsonb('messages').$type<ChatMessage[]>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.browser, table.id] }), index('chats_browser_updated_idx').on(table.browser, table.updatedAt)]);
