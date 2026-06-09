-- ============================================================
-- KEYRO DATABASE SCHEMA
-- MySQL 8+ / MariaDB 10.4+ compatible
-- ============================================================

CREATE DATABASE IF NOT EXISTS keyro_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE keyro_db;

-- ─── Platforms ───
CREATE TABLE IF NOT EXISTS platforms (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  slug        VARCHAR(50)  NOT NULL UNIQUE,
  icon_url    VARCHAR(255) DEFAULT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Genres ───
CREATE TABLE IF NOT EXISTS genres (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  slug        VARCHAR(50)  NOT NULL UNIQUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Users ───
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  avatar_url    VARCHAR(255) DEFAULT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role  (role)
) ENGINE=InnoDB;

-- ─── Products ───
CREATE TABLE IF NOT EXISTS products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  platform_id     INT          NOT NULL,
  region          VARCHAR(100) NOT NULL DEFAULT 'Global',
  activation      VARCHAR(255) NOT NULL,
  original_price  DECIMAL(10,2) NOT NULL,
  sale_price      DECIMAL(10,2) NOT NULL,
  discount_percent INT         NOT NULL DEFAULT 0,
  image_url       VARCHAR(255) DEFAULT NULL,
  description     TEXT,
  os_req          VARCHAR(255) DEFAULT NULL,
  cpu_req         VARCHAR(255) DEFAULT NULL,
  ram_req         VARCHAR(255) DEFAULT NULL,
  gpu_req         VARCHAR(255) DEFAULT NULL,
  stock           INT          NOT NULL DEFAULT 100,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE RESTRICT,
  INDEX idx_products_platform (platform_id),
  INDEX idx_products_active   (is_active),
  INDEX idx_products_sale     (sale_price),
  FULLTEXT INDEX ft_products_name_desc (name, description)
) ENGINE=InnoDB;

-- ─── Product-Genre many-to-many ───
CREATE TABLE IF NOT EXISTS product_genres (
  product_id INT NOT NULL,
  genre_id   INT NOT NULL,
  PRIMARY KEY (product_id, genre_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id)   REFERENCES genres(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Reviews ───
CREATE TABLE IF NOT EXISTS reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT          NOT NULL,
  user_id     INT          NOT NULL,
  rating      TINYINT      NOT NULL,
  text        TEXT         NOT NULL,
  is_approved TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_reviews_product (product_id),
  INDEX idx_reviews_user    (user_id),
  UNIQUE KEY uk_review_product_user (product_id, user_id)
) ENGINE=InnoDB;

-- ─── Orders ───
CREATE TABLE IF NOT EXISTS orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  order_number  VARCHAR(30)  NOT NULL UNIQUE,
  status        ENUM('pending','paid','processing','delivered','cancelled','refunded')
                              NOT NULL DEFAULT 'pending',
  subtotal      DECIMAL(10,2) NOT NULL,
  discount      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total         DECIMAL(10,2) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_orders_user   (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_date   (created_at)
) ENGINE=InnoDB;

-- ─── Order Items ───
CREATE TABLE IF NOT EXISTS order_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT           NOT NULL,
  product_id     INT           NOT NULL,
  product_name   VARCHAR(255)  NOT NULL,
  quantity        INT           NOT NULL DEFAULT 1,
  unit_price     DECIMAL(10,2)  NOT NULL,
  original_price DECIMAL(10,2)  NOT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)  ON DELETE RESTRICT,
  INDEX idx_oi_order (order_id)
) ENGINE=InnoDB;

-- ─── Cart Items ───
CREATE TABLE IF NOT EXISTS cart_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT  NOT NULL,
  product_id  INT  NOT NULL,
  quantity    INT  NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uk_cart_user_product (user_id, product_id),
  INDEX idx_cart_user (user_id)
) ENGINE=InnoDB;

-- ─── Wishlist Items ───
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT  NOT NULL,
  product_id  INT  NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uk_wishlist_user_product (user_id, product_id),
  INDEX idx_wishlist_user (user_id)
) ENGINE=InnoDB;

-- ─── Refresh Tokens ───
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT       NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rt_user   (user_id),
  INDEX idx_rt_expires (expires_at)
) ENGINE=InnoDB;