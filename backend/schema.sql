-- Disable foreign key checks temporarily during creation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `tables`;
DROP TABLE IF EXISTS `areas`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `product_components`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `discounts`;
DROP TABLE IF EXISTS `modifier_options`;
DROP TABLE IF EXISTS `modifiers`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `menu_items`;

-- 1. Settings (Key-Value pairs for global configs like receipt, features, etc.)
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(50) PRIMARY KEY,
  `setting_value` JSON NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Users (Expanded to include full Employee Profile info)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE, -- used as login or pin entry identifier if needed
  `pin_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('administrator', 'manager', 'cashier', 'inventory manager', 'admin') DEFAULT 'cashier',
  `name` VARCHAR(100),
  `email` VARCHAR(100),
  `phone` VARCHAR(20),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Customers
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100),
  `phone` VARCHAR(20),
  `address` VARCHAR(255),
  `province` VARCHAR(100),
  `city` VARCHAR(100),
  `barangay` VARCHAR(100),
  `zip_code` VARCHAR(20),
  `customer_code` VARCHAR(50) UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `color` VARCHAR(20) DEFAULT '#fbbd05'
) ENGINE=InnoDB;

-- 5. Modifiers & Options
CREATE TABLE IF NOT EXISTS `modifiers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `modifier_options` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `modifier_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) DEFAULT 0.00,
  FOREIGN KEY (`modifier_id`) REFERENCES `modifiers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Discounts
CREATE TABLE IF NOT EXISTS `discounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('percentage', 'amount') NOT NULL,
  `value` DECIMAL(10,2) NOT NULL,
  `restricted` BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB;

-- 7. Products (The Beast)
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `category_id` INT,
  `description` TEXT,
  `is_available` BOOLEAN DEFAULT TRUE,
  `sold_by` ENUM('each', 'weight') DEFAULT 'each',
  `price` DECIMAL(10,2) DEFAULT 0.00,
  `cost` DECIMAL(10,2) DEFAULT 0.00,
  `sku` VARCHAR(50),
  `barcode` VARCHAR(20),
  
  -- Inventory
  `is_composite` BOOLEAN DEFAULT FALSE,
  `track_stock` BOOLEAN DEFAULT FALSE,
  `in_stock` INT DEFAULT 0,
  `low_stock` INT DEFAULT 0,
  
  -- Display
  `label_color` VARCHAR(20) DEFAULT '#fbbd05',
  `image_url` VARCHAR(255),
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_sku_per_branch` (`branch_id`, `sku`),
  UNIQUE KEY `unique_barcode_per_branch` (`branch_id`, `barcode`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7a. Product Components (For Composite Items)
CREATE TABLE IF NOT EXISTS `product_components` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parent_product_id` INT NOT NULL,
  `component_product_id` INT NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1,
  `cost` DECIMAL(10,2) DEFAULT 0.00,
  FOREIGN KEY (`parent_product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`component_product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7b. Product Variants (Shopify style dynamic sub-items)
CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL, -- e.g., "Large / Vanilla"
  `sku` VARCHAR(50) UNIQUE,
  `price` DECIMAL(10,2) NOT NULL,
  `stock` INT DEFAULT 0,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Areas
CREATE TABLE IF NOT EXISTS `areas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_id` BIGINT NOT NULL, -- Storing timestamp-based ID from settings JSON
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('Indoor', 'Outdoor') NOT NULL DEFAULT 'Indoor',
  `map_image_url` VARCHAR(255)
) ENGINE=InnoDB;

-- 8a. Restaurant Tables
CREATE TABLE IF NOT EXISTS `tables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `area_id` INT,
  `table_number` VARCHAR(10) NOT NULL UNIQUE,
  `status` ENUM('available', 'occupied') DEFAULT 'available',
  FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `table_id` INT DEFAULT NULL,
  `customer_id` INT DEFAULT NULL,
  `status` ENUM('open', 'paid', 'cancelled') DEFAULT 'open',
  `total_amount` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`),
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
  INDEX `idx_status_created` (`status`, `created_at`)
) ENGINE=InnoDB;

-- 10. Order Items (Updated to point to products)
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `variant_id` INT DEFAULT NULL, -- Null if base product
  `quantity` INT NOT NULL DEFAULT 1,
  `price_at_time` DECIMAL(10,2) NOT NULL,
  `notes` VARCHAR(255),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
) ENGINE=InnoDB;

-- 11. Payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('cash', 'card', 'digital') NOT NULL,
  `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
  INDEX `idx_payment_date` (`payment_date`)
) ENGINE=InnoDB;

-- We DROP the legacy table
DROP TABLE IF EXISTS `menu_items`;

SET FOREIGN_KEY_CHECKS = 1;

-- Seed initial data
INSERT IGNORE INTO `users` (username, pin_hash, role, name, email) VALUES ('admin', '1234', 'administrator', 'System Admin', 'admin@pos.com');
INSERT IGNORE INTO `users` (username, pin_hash, role, name) VALUES ('cashier1', '1111', 'cashier', 'John Cashier');

INSERT IGNORE INTO `tables` (table_number, status) VALUES ('1', 'available'), ('2', 'available'), ('3', 'available'), ('4', 'available');

-- Products and Categories are now branch specific or wiped, leaving them empty for the user to seed via UI
