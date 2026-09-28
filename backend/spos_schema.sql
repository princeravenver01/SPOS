CREATE DATABASE IF NOT EXISTS `SPOS_db`;
USE `SPOS_db`;

-- 1a. Access Roles
CREATE TABLE IF NOT EXISTS `access_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) UNIQUE NOT NULL,
  `permissions` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1b. Users (Admin / Staff)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `pin_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'manager', 'cashier') NOT NULL,
  `role_id` INT DEFAULT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `access_roles`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 2. Branches
CREATE TABLE IF NOT EXISTS `branches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255),
  `provCode` VARCHAR(50),
  `cityCode` VARCHAR(50),
  `brgyCode` VARCHAR(50),
  `provinceName` VARCHAR(100),
  `cityName` VARCHAR(100),
  `brgyName` VARCHAR(100),
  `postalCode` VARCHAR(20),
  `phone` VARCHAR(50),
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Receipt Settings
CREATE TABLE IF NOT EXISTS `receipt_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT NOT NULL,
  `logo_url` VARCHAR(255),
  `header_text` TEXT,
  `footer_text` TEXT,
  `show_customer_info` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Areas
CREATE TABLE IF NOT EXISTS `areas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) DEFAULT 'Indoor',
  `map_image_url` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Tables
CREATE TABLE IF NOT EXISTS `tables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `area_id` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `capacity` INT DEFAULT 4,
  `is_enabled` BOOLEAN DEFAULT TRUE,
  `x_position` FLOAT DEFAULT 0,
  `y_position` FLOAT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_table_per_area` (`area_id`, `name`)
) ENGINE=InnoDB;

-- 6. Taxes
CREATE TABLE IF NOT EXISTS `taxes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `rate` DECIMAL(10,2) NOT NULL,
  `rate_type` ENUM('%', '$') DEFAULT '%',
  `calculation_type` ENUM('added', 'included') DEFAULT 'added',
  `depends_on_dining` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tax_branches` (
  `tax_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  PRIMARY KEY (`tax_id`, `branch_id`),
  FOREIGN KEY (`tax_id`) REFERENCES `taxes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tax_dining_options` (
  `tax_id` INT NOT NULL,
  `dining_option_id` INT NOT NULL,
  PRIMARY KEY (`tax_id`, `dining_option_id`),
  FOREIGN KEY (`tax_id`) REFERENCES `taxes`(`id`) ON DELETE CASCADE
  -- We'll add the foreign key to dining_options table below after it is created or here if we create it first
) ENGINE=InnoDB;

-- 7. Payment Types
CREATE TABLE IF NOT EXISTS `payment_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `branch_id` INT DEFAULT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Dining Options
CREATE TABLE IF NOT EXISTS `dining_options` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Add FK for tax_dining_options now that dining_options exists
ALTER TABLE `tax_dining_options`
ADD CONSTRAINT `fk_tax_dining_options_do` 
FOREIGN KEY (`dining_option_id`) REFERENCES `dining_options`(`id`) ON DELETE CASCADE;

-- 9. POS Devices
CREATE TABLE IF NOT EXISTS `pos_devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `branch_id` INT NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Customers
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100),
  `phone` VARCHAR(50),
  `address` VARCHAR(255),
  `province` VARCHAR(100),
  `city` VARCHAR(100),
  `barangay` VARCHAR(100),
  `zip_code` VARCHAR(20),
  `customer_code` VARCHAR(50) UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 11. Categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(20) DEFAULT '#fbbd05',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. Products
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category_id` INT,
  `description` TEXT,
  `is_available` BOOLEAN DEFAULT TRUE,
  `sold_by` ENUM('each', 'weight', 'volume') DEFAULT 'each',
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `cost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `sku` VARCHAR(100),
  `barcode` VARCHAR(100),
  `is_composite` BOOLEAN DEFAULT FALSE,
  `track_stock` BOOLEAN DEFAULT FALSE,
  `in_stock` DECIMAL(10, 2) DEFAULT 0,
  `low_stock` DECIMAL(10, 2) DEFAULT 0,
  `label_color` VARCHAR(20) DEFAULT '#fbbd05',
  `image_url` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_branch_sku` (`branch_id`, `sku`)
) ENGINE=InnoDB;

-- 13. Product Components
CREATE TABLE IF NOT EXISTS `product_components` (
  `parent_product_id` INT NOT NULL,
  `component_product_id` INT NOT NULL,
  `quantity` DECIMAL(10, 4) NOT NULL DEFAULT 1,
  `cost` DECIMAL(10, 2) DEFAULT 0,
  PRIMARY KEY (`parent_product_id`, `component_product_id`),
  FOREIGN KEY (`parent_product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`component_product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. Product Variants
CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `sku` VARCHAR(100),
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `stock` DECIMAL(10, 2) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. Legacy Settings (Temporary until fully migrated)
CREATE TABLE IF NOT EXISTS `modifiers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `is_required` BOOLEAN DEFAULT FALSE,
  `max_selections` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `modifier_options` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `modifier_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10, 2) DEFAULT 0.00,
  FOREIGN KEY (`modifier_id`) REFERENCES `modifiers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `product_modifiers` (
  `product_id` INT NOT NULL,
  `modifier_id` INT NOT NULL,
  PRIMARY KEY (`product_id`, `modifier_id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`modifier_id`) REFERENCES `modifiers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(50) PRIMARY KEY,
  `setting_value` JSON NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed default admin user (PIN: 1234)
INSERT IGNORE INTO `users` (username, pin_hash, role) VALUES 
('admin', '1234', 'admin');
-- 15. Discounts
CREATE TABLE IF NOT EXISTS `discounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('percentage', 'amount') DEFAULT 'percentage',
  `value` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `restricted` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- 16. Suppliers
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `website` VARCHAR(255),
  `address_1` VARCHAR(255),
  `address_2` VARCHAR(255),
  `province` VARCHAR(100),
  `city` VARCHAR(100),
  `barangay` VARCHAR(100),
  `zip_code` VARCHAR(20),
  `note` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 17. Purchase Orders
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_number` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_id` INT,
  `branch_id` INT,
  `status` ENUM('Draft', 'Pending', 'Partially Received', 'Closed') DEFAULT 'Draft',
  `po_date` DATE,
  `expected_on` DATE,
  `notes` TEXT,
  `total_amount` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 18. Purchase Order Items
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `received` INT NOT NULL DEFAULT 0,
  `cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
