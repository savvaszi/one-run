import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const races = sqliteTable('races', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  icon: text('icon').notNull(),
  date: text('date').notNull(),
  month: integer('month').notNull(),
  price_from: text('price_from').notNull(),
  terrain: text('terrain').notNull(),
  status: text('status', { enum: ['open', 'soldout', 'express'] }).notNull(),
  desc1: text('desc1').notNull(),
  desc2: text('desc2').notNull(),
  photos: text('photos').notNull(),
  included: text('included').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const hotels = sqliteTable('hotels', {
  id: text('id').primaryKey(),
  race_id: text('race_id').notNull().references(() => races.id),
  name: text('name').notNull(),
  area: text('area').notNull(),
  stars: integer('stars').notNull(),
  features: text('features').notNull(),
  single_price: integer('single_price').notNull(),
  twin_price: integer('twin_price').notNull(),
  total_seats: integer('total_seats').notNull().default(50),
  booked_seats: integer('booked_seats').notNull().default(0),
  website: text('website').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  race_id: text('race_id').notNull().references(() => races.id),
  hotel_id: text('hotel_id').notNull().references(() => hotels.id),
  package_type: text('package_type', { enum: ['single', 'twin'] }).notNull(),
  total_amount: integer('total_amount').notNull(),
  currency: text('currency').notNull().default('EUR'),
  revolut_order_id: text('revolut_order_id'),
  status: text('status', { enum: ['pending', 'paid', 'cancelled'] }).notNull().default('pending'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const runners = sqliteTable('runners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  booking_id: text('booking_id').notNull().references(() => bookings.id),
  full_name: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  nationality: text('nationality').notNull(),
  passport_id: text('passport_id').notNull(),
  expected_time: text('expected_time').notNull(),
  certificate: text('certificate'),
  requirements: text('requirements'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

export const interestRegistrations = sqliteTable('interest_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  race_name: text('race_name').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});
