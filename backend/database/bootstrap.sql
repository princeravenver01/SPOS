SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS access_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  permissions JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  provCode VARCHAR(50),
  cityCode VARCHAR(50),
  brgyCode VARCHAR(50),
  provinceName VARCHAR(100),
  cityName VARCHAR(100),
  brgyName VARCHAR(100),
  postalCode VARCHAR(20),
  phone VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  pin_hash VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role ENUM('admin', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
  role_id INT,
  name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES access_roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_branches (
  user_id INT NOT NULL,
  branch_id INT NOT NULL,
  PRIMARY KEY (user_id, branch_id),
  CONSTRAINT fk_user_branches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_branches_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receipt_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL UNIQUE,
  logo_url VARCHAR(255),
  header_text TEXT,
  footer_text TEXT,
  show_customer_info BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_receipt_settings_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Indoor',
  map_image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_areas_branch (branch_id),
  CONSTRAINT fk_areas_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT NOT NULL,
  merged_with_table_id INT,
  name VARCHAR(50) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  x_position FLOAT NOT NULL DEFAULT 0,
  y_position FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tables_merged_with (merged_with_table_id),
  UNIQUE KEY uq_table_area_name (area_id, name),
  CONSTRAINT fk_tables_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
  CONSTRAINT fk_tables_merged_with FOREIGN KEY (merged_with_table_id) REFERENCES tables(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dining_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS taxes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  rate_type ENUM('%', '$') NOT NULL DEFAULT '%',
  calculation_type ENUM('added', 'included') NOT NULL DEFAULT 'added',
  depends_on_dining BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tax_branches (
  tax_id INT NOT NULL,
  branch_id INT NOT NULL,
  PRIMARY KEY (tax_id, branch_id),
  CONSTRAINT fk_tax_branches_tax FOREIGN KEY (tax_id) REFERENCES taxes(id) ON DELETE CASCADE,
  CONSTRAINT fk_tax_branches_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tax_dining_options (
  tax_id INT NOT NULL,
  dining_option_id INT NOT NULL,
  PRIMARY KEY (tax_id, dining_option_id),
  CONSTRAINT fk_tax_dining_tax FOREIGN KEY (tax_id) REFERENCES taxes(id) ON DELETE CASCADE,
  CONSTRAINT fk_tax_dining_option FOREIGN KEY (dining_option_id) REFERENCES dining_options(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  branch_id INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_types_branch (branch_id),
  CONSTRAINT fk_payment_types_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  branch_id INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pos_devices_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(50),
  address VARCHAR(255),
  province VARCHAR(100),
  city VARCHAR(100),
  barangay VARCHAR(100),
  zip_code VARCHAR(20),
  customer_code VARCHAR(50) UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_branch (branch_id),
  CONSTRAINT fk_customers_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#fbbd05',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_branch_name (branch_id, name),
  CONSTRAINT fk_categories_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id INT,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sold_by ENUM('each', 'weight', 'volume') NOT NULL DEFAULT 'each',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  is_composite BOOLEAN NOT NULL DEFAULT FALSE,
  use_production BOOLEAN NOT NULL DEFAULT FALSE,
  track_stock BOOLEAN NOT NULL DEFAULT FALSE,
  in_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  low_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  label_color VARCHAR(20) NOT NULL DEFAULT '#fbbd05',
  image_url LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_products_branch_sku (branch_id, sku),
  UNIQUE KEY uq_products_branch_barcode (branch_id, barcode),
  INDEX idx_products_branch_category (branch_id, category_id),
  CONSTRAINT fk_products_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_components (
  parent_product_id INT NOT NULL,
  component_product_id INT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (parent_product_id, component_product_id),
  CONSTRAINT fk_product_components_parent FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_components_component FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(100),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_variants_product (product_id),
  CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modifiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  max_selections INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_modifiers_branch (branch_id),
  CONSTRAINT fk_modifiers_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modifier_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modifier_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_modifier_options_modifier FOREIGN KEY (modifier_id) REFERENCES modifiers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_modifiers (
  product_id INT NOT NULL,
  modifier_id INT NOT NULL,
  PRIMARY KEY (product_id, modifier_id),
  CONSTRAINT fk_product_modifiers_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_modifiers_modifier FOREIGN KEY (modifier_id) REFERENCES modifiers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('percentage', 'amount') NOT NULL DEFAULT 'percentage',
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  restricted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  address_1 VARCHAR(255),
  address_2 VARCHAR(255),
  province VARCHAR(100),
  city VARCHAR(100),
  barangay VARCHAR(100),
  zip_code VARCHAR(20),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id INT,
  branch_id INT,
  status ENUM('Draft', 'Pending', 'Partially Received', 'Closed') NOT NULL DEFAULT 'Draft',
  po_date DATE,
  expected_on DATE,
  notes TEXT,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_purchase_orders_branch_status (branch_id, status),
  CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchase_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  received DECIMAL(12,3) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_purchase_order_items_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  cashier_id INT NOT NULL,
  cashier_name VARCHAR(255) NOT NULL,
  starting_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
  cash_payments DECIMAL(12,2) NOT NULL DEFAULT 0,
  cash_refunds DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_in DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_out DECIMAL(12,2) NOT NULL DEFAULT 0,
  expected_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_cash DECIMAL(12,2),
  difference DECIMAL(12,2),
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  INDEX idx_pos_shifts_open (branch_id, cashier_id, status),
  CONSTRAINT fk_pos_shifts_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_shifts_cashier FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT,
  user_id INT NOT NULL,
  table_id INT,
  customer_id INT,
  dining_option_id INT,
  discount_id INT,
  ticket_name VARCHAR(100),
  pax INT NOT NULL DEFAULT 1,
  status ENUM('open', 'paid', 'cancelled', 'refunded') NOT NULL DEFAULT 'open',
  gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_status_created (status, created_at),
  INDEX idx_orders_branch_status_created (branch_id, status, created_at),
  INDEX idx_orders_user_created (user_id, created_at),
  CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_dining FOREIGN KEY (dining_option_id) REFERENCES dining_options(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_discount FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  price_at_time DECIMAL(10,2) NOT NULL,
  cost_at_time DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes VARCHAR(255),
  INDEX idx_order_items_order (order_id),
  INDEX idx_order_items_product (product_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_date (payment_date),
  INDEX idx_payments_order (order_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_page_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_id INT NOT NULL,
  grid_index INT NOT NULL,
  type ENUM('product', 'category', 'discount') NOT NULL,
  reference_id INT NOT NULL,
  UNIQUE KEY uq_pos_page_grid_slot (page_id, grid_index),
  CONSTRAINT fk_pos_page_items_page FOREIGN KEY (page_id) REFERENCES pos_pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  branch_id INT NOT NULL,
  employee_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
  reason VARCHAR(255) NOT NULL,
  adjustment DECIMAL(12,3) NOT NULL,
  stock_after DECIMAL(12,3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inventory_history_product_created (product_id, created_at),
  INDEX idx_inventory_history_branch_created (branch_id, created_at),
  CONSTRAINT fk_inventory_history_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_history_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_counts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ic_number VARCHAR(50) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'Partial',
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_inventory_counts_branch_status (branch_id, status),
  CONSTRAINT fk_inventory_counts_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_count_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ic_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  expected_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  counted_stock DECIMAL(12,3),
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_inventory_count_items_count FOREIGN KEY (ic_id) REFERENCES inventory_counts(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_count_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sa_number VARCHAR(50) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  reason VARCHAR(50) NOT NULL,
  sa_date DATE,
  notes TEXT,
  adjusted_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_adjustments_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sa_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  in_stock_before DECIMAL(12,3) NOT NULL DEFAULT 0,
  quantity_adjusted DECIMAL(12,3) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_adjustment_items_adjustment FOREIGN KEY (sa_id) REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_adjustment_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transfer_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_number VARCHAR(50) NOT NULL UNIQUE,
  source_branch_id INT NOT NULL,
  dest_branch_id INT NOT NULL,
  to_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_transfer_orders_status (status),
  CONSTRAINT fk_transfer_orders_source FOREIGN KEY (source_branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_orders_destination FOREIGN KEY (dest_branch_id) REFERENCES branches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transfer_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_id INT NOT NULL,
  source_product_id INT NOT NULL,
  dest_product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  received DECIMAL(12,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transfer_order_items_order FOREIGN KEY (to_id) REFERENCES transfer_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_transfer_order_items_source FOREIGN KEY (source_product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_order_items_destination FOREIGN KEY (dest_product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pr_number VARCHAR(50) NOT NULL UNIQUE,
  branch_id INT NOT NULL,
  type ENUM('Production', 'Disassembly') NOT NULL DEFAULT 'Production',
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_productions_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS production_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity DECIMAL(12,3) NOT NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_production_items_production FOREIGN KEY (production_id) REFERENCES productions(id) ON DELETE CASCADE,
  CONSTRAINT fk_production_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS printers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type ENUM('counter', 'kitchen') NOT NULL DEFAULT 'counter',
  ip_address VARCHAR(45) NOT NULL,
  port INT NOT NULL DEFAULT 9100,
  paper_width VARCHAR(10) NOT NULL DEFAULT '58mm',
  branch_id INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_print BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_printers_branch_type (branch_id, type),
  CONSTRAINT fk_printers_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS table_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  table_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  pax INT NOT NULL DEFAULT 1,
  reservation_time DATETIME NOT NULL,
  status ENUM('upcoming', 'seated', 'cancelled') NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reservations_branch_time (branch_id, reservation_time),
  INDEX idx_reservations_table_status (table_id, status),
  CONSTRAINT fk_reservations_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservations_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO access_roles (id, name, permissions) VALUES
  (1, 'Administrator', JSON_OBJECT(
    'pos_access', TRUE,
    'void_orders', TRUE,
    'apply_discounts', TRUE,
    'manage_inventory', TRUE,
    'manage_employees', TRUE,
    'manage_settings', TRUE,
    'view_reports', TRUE,
    'refund_payments', TRUE
  )),
  (2, 'Cashier', JSON_OBJECT(
    'pos_access', TRUE,
    'void_orders', FALSE,
    'apply_discounts', FALSE,
    'manage_inventory', FALSE,
    'manage_employees', FALSE,
    'manage_settings', FALSE,
    'view_reports', FALSE,
    'refund_payments', FALSE
  ));

INSERT IGNORE INTO branches (id, name, description)
VALUES (1, 'Main Branch', 'Default branch created during installation');

INSERT IGNORE INTO users (
  id, username, pin_hash, password_hash, role, role_id, name, email
) VALUES (
  1, 'admin', '1234', 'admin123', 'admin', 1, 'System Administrator', 'admin@localhost'
);

INSERT IGNORE INTO user_branches (user_id, branch_id) VALUES (1, 1);
INSERT IGNORE INTO dining_options (id, name) VALUES (1, 'Dine In'), (2, 'Takeout');
INSERT IGNORE INTO payment_types (id, type, name, branch_id) VALUES (1, 'cash', 'Cash', NULL);
INSERT IGNORE INTO pos_devices (id, name, branch_id) VALUES (1, 'Main POS', 1);
INSERT IGNORE INTO pos_pages (id, name, sort_order) VALUES (1, 'Page 1', 0);
