CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`province_code` text NOT NULL,
	`package_code` text NOT NULL,
	`points` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_order_events_request_id` ON `order_events` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_order_events_province_created` ON `order_events` (`province_code`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_order_events_package_created` ON `order_events` (`package_code`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_order_events_created_at` ON `order_events` (`created_at`);