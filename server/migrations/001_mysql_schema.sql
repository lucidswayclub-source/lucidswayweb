CREATE TABLE users (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), email VARCHAR(320) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL, phone VARCHAR(32) UNIQUE,
 password_hash VARCHAR(255) NOT NULL, role ENUM('admin','organiser','scanner','volunteer','customer') NOT NULL DEFAULT 'customer',
 referral_code VARCHAR(32) NOT NULL UNIQUE DEFAULT (UPPER(SUBSTRING(REPLACE(UUID(),'-',''),1,10))), active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 CHECK (email=LOWER(email))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sessions (
 token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL, expires_at DATETIME(3) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX sessions_expiry(expires_at), CONSTRAINT sessions_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE login_limits (throttle_key CHAR(64) PRIMARY KEY, attempts INT NOT NULL, expires_at DATETIME(3) NOT NULL) ENGINE=InnoDB;

CREATE TABLE events (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), slug VARCHAR(180) NOT NULL UNIQUE, name VARCHAR(200) NOT NULL, description TEXT NOT NULL,
 city VARCHAR(100) NOT NULL, venue VARCHAR(255) NOT NULL, maps_url VARCHAR(2048) NOT NULL DEFAULT '', image_url VARCHAR(2048) NOT NULL DEFAULT '',
 starts_at DATETIME(3) NOT NULL, ends_at DATETIME(3) NOT NULL, timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
 status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft', version INT NOT NULL DEFAULT 1,
 referral_reward_paise INT NOT NULL DEFAULT 0, refund_policy TEXT NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX events_catalogue(status,starts_at), CHECK (ends_at>starts_at), CHECK (referral_reward_paise BETWEEN 0 AND 1000000)
) ENGINE=InnoDB;

CREATE TABLE event_access (
 event_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, membership_type ENUM('creator','volunteer') NOT NULL DEFAULT 'creator',
 can_edit BOOLEAN NOT NULL DEFAULT FALSE, can_scan BOOLEAN NOT NULL DEFAULT FALSE, can_export BOOLEAN NOT NULL DEFAULT FALSE,
 can_manage_members BOOLEAN NOT NULL DEFAULT FALSE, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(event_id,user_id),
 CONSTRAINT event_access_event_fk FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
 CONSTRAINT event_access_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE passes (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), event_id CHAR(36) NOT NULL, name VARCHAR(80) NOT NULL, amount_paise INT NOT NULL,
 currency CHAR(3) NOT NULL DEFAULT 'INR', capacity INT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE KEY passes_event_name(event_id,name),
 CONSTRAINT passes_event_fk FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
 CHECK(amount_paise BETWEEN 0 AND 100000000), CHECK(currency='INR'), CHECK(capacity>0)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_id CHAR(36), action VARCHAR(100) NOT NULL, event_id CHAR(36),
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), CONSTRAINT audit_actor_fk FOREIGN KEY(actor_id) REFERENCES users(id),
 CONSTRAINT audit_event_fk FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE coupons (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), event_id CHAR(36), code VARCHAR(32) NOT NULL, discount_type ENUM('percent','fixed') NOT NULL,
 value INT NOT NULL, min_spend_paise INT NOT NULL DEFAULT 0, max_uses INT, per_customer INT NOT NULL DEFAULT 1,
 expires_at DATETIME(3), active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), UNIQUE KEY coupons_event_code(event_id,code),
 CONSTRAINT coupons_event_fk FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
 CHECK(value>0), CHECK(min_spend_paise>=0), CHECK(max_uses IS NULL OR max_uses>0), CHECK(per_customer>0)
) ENGINE=InnoDB;

CREATE TABLE orders (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), reference VARCHAR(64) NOT NULL UNIQUE, user_id CHAR(36) NOT NULL, event_id CHAR(36) NOT NULL,
 status ENUM('pending','paid','failed','expired','cancelled','refunded') NOT NULL DEFAULT 'pending', amount_paise INT NOT NULL,
 subtotal_paise INT NOT NULL DEFAULT 0, discount_paise INT NOT NULL DEFAULT 0, currency CHAR(3) NOT NULL DEFAULT 'INR',
 referral_owner_id CHAR(36), referral_code_snapshot VARCHAR(32), referral_credit_paise INT NOT NULL DEFAULT 0, coupon_id CHAR(36),
 expires_at DATETIME(3) NOT NULL, paid_at DATETIME(3), provider_order_id VARCHAR(100) UNIQUE, provider_payment_id VARCHAR(100) UNIQUE,
 checkout_created_at DATETIME(3), client_key CHAR(36) NOT NULL, refund_policy_snapshot TEXT, event_policy_version INT, policy_accepted_at DATETIME(3),
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY orders_user_client_key(user_id,client_key), INDEX orders_user_created(user_id,created_at), INDEX orders_event_status(event_id,status),
 CONSTRAINT orders_user_fk FOREIGN KEY(user_id) REFERENCES users(id), CONSTRAINT orders_event_fk FOREIGN KEY(event_id) REFERENCES events(id),
 CONSTRAINT orders_referral_owner_fk FOREIGN KEY(referral_owner_id) REFERENCES users(id), CONSTRAINT orders_coupon_fk FOREIGN KEY(coupon_id) REFERENCES coupons(id),
 CHECK(amount_paise>=0), CHECK(subtotal_paise>=0), CHECK(discount_paise>=0), CHECK(currency='INR'), CHECK(referral_credit_paise>=0)
) ENGINE=InnoDB;

CREATE TABLE order_items (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), order_id CHAR(36) NOT NULL, pass_id CHAR(36) NOT NULL, pass_name VARCHAR(80) NOT NULL,
 unit_amount_paise INT NOT NULL, quantity INT NOT NULL, UNIQUE KEY order_items_order_pass(order_id,pass_id),
 CONSTRAINT order_items_order_fk FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
 CONSTRAINT order_items_pass_fk FOREIGN KEY(pass_id) REFERENCES passes(id), CHECK(unit_amount_paise>=0), CHECK(quantity BETWEEN 1 AND 10)
) ENGINE=InnoDB;

CREATE TABLE tickets (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), order_id CHAR(36) NOT NULL, order_item_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
 event_id CHAR(36) NOT NULL, pass_name VARCHAR(80) NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE,
 status ENUM('active','used','cancelled','refunded') NOT NULL DEFAULT 'active', used_at DATETIME(3), used_by CHAR(36),
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX tickets_user_event(user_id,event_id),
 CONSTRAINT tickets_order_fk FOREIGN KEY(order_id) REFERENCES orders(id), CONSTRAINT tickets_item_fk FOREIGN KEY(order_item_id) REFERENCES order_items(id),
 CONSTRAINT tickets_user_fk FOREIGN KEY(user_id) REFERENCES users(id), CONSTRAINT tickets_event_fk FOREIGN KEY(event_id) REFERENCES events(id),
 CONSTRAINT tickets_used_by_fk FOREIGN KEY(used_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE payout_requests (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, amount_paise INT NOT NULL,
 status ENUM('requested','approved','paid','rejected') NOT NULL DEFAULT 'requested', reviewed_by CHAR(36), reviewed_at DATETIME(3),
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), CONSTRAINT payouts_user_fk FOREIGN KEY(user_id) REFERENCES users(id),
 CONSTRAINT payouts_reviewer_fk FOREIGN KEY(reviewed_by) REFERENCES users(id), CHECK(amount_paise>0)
) ENGINE=InnoDB;

CREATE TABLE wallet_entries (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, order_id CHAR(36) NOT NULL, amount_paise INT NOT NULL,
 status ENUM('pending','available','redeemed','reversed') NOT NULL DEFAULT 'pending', available_at DATETIME(3), payout_request_id CHAR(36),
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), UNIQUE KEY wallet_user_order(user_id,order_id), INDEX wallet_user_status(user_id,status),
 CONSTRAINT wallet_user_fk FOREIGN KEY(user_id) REFERENCES users(id), CONSTRAINT wallet_order_fk FOREIGN KEY(order_id) REFERENCES orders(id),
 CONSTRAINT wallet_payout_fk FOREIGN KEY(payout_request_id) REFERENCES payout_requests(id), CHECK(amount_paise>0)
) ENGINE=InnoDB;

CREATE TABLE coupon_uses (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), coupon_id CHAR(36) NOT NULL, order_id CHAR(36) NOT NULL UNIQUE, user_id CHAR(36) NOT NULL,
 status ENUM('reserved','applied','released') NOT NULL DEFAULT 'reserved', created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX coupon_uses_limits(coupon_id,user_id,status), CONSTRAINT coupon_uses_coupon_fk FOREIGN KEY(coupon_id) REFERENCES coupons(id),
 CONSTRAINT coupon_uses_order_fk FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE, CONSTRAINT coupon_uses_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE payment_events (
 provider VARCHAR(40) NOT NULL, event_id VARCHAR(160) NOT NULL, event_type VARCHAR(100) NOT NULL, payload JSON NOT NULL,
 processed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(provider,event_id)
) ENGINE=InnoDB;

CREATE TABLE delivery_outbox (
 id CHAR(36) PRIMARY KEY DEFAULT (UUID()), ticket_id CHAR(36) NOT NULL UNIQUE, channel ENUM('email') NOT NULL,
 recipient VARCHAR(320) NOT NULL, status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
 next_attempt_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT delivery_ticket_fk FOREIGN KEY(ticket_id) REFERENCES tickets(id)
) ENGINE=InnoDB;
