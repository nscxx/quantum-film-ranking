CREATE TABLE `display_events` (
	`cursor` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`submission_id` text NOT NULL,
	`province_code` text NOT NULL,
	`package_summary` text NOT NULL,
	`total_points` integer NOT NULL,
	`score_before` integer NOT NULL,
	`score_after` integer NOT NULL,
	`rank_before` integer NOT NULL,
	`rank_after` integer NOT NULL,
	`milestone` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_display_events_id` ON `display_events` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_display_events_submission` ON `display_events` (`submission_id`);--> statement-breakpoint
CREATE TABLE `package_rule_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`package_code` text NOT NULL,
	`old_points` integer NOT NULL,
	`new_points` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_package_rule_changes_created` ON `package_rule_changes` (`created_at`);--> statement-breakpoint
CREATE TABLE `package_rules` (
	`code` text PRIMARY KEY NOT NULL,
	`points` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `score_submission_items` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`package_code` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_points` integer NOT NULL,
	`subtotal` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_score_submission_items_submission` ON `score_submission_items` (`submission_id`);--> statement-breakpoint
CREATE INDEX `idx_score_submission_items_package` ON `score_submission_items` (`package_code`);--> statement-breakpoint
CREATE TABLE `score_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`province_code` text NOT NULL,
	`total_points` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_score_submissions_request_id` ON `score_submissions` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_score_submissions_province_created` ON `score_submissions` (`province_code`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_score_submissions_created_at` ON `score_submissions` (`created_at`);