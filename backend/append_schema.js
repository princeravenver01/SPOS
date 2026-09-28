const fs = require('fs');

const content = `

-- 16. Suppliers
CREATE TABLE IF NOT EXISTS \`suppliers\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255),
  \`phone\` VARCHAR(50),
  \`website\` VARCHAR(255),
  \`address_1\` VARCHAR(255),
  \`address_2\` VARCHAR(255),
  \`province\` VARCHAR(100),
  \`city\` VARCHAR(100),
  \`barangay\` VARCHAR(100),
  \`zip_code\` VARCHAR(20),
  \`note\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 17. Purchase Orders
CREATE TABLE IF NOT EXISTS \`purchase_orders\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`po_number\` VARCHAR(50) NOT NULL UNIQUE,
  \`supplier_id\` INT,
  \`branch_id\` INT,
  \`status\` ENUM('Draft', 'Pending', 'Partially Received', 'Closed') DEFAULT 'Draft',
  \`po_date\` DATE,
  \`expected_on\` DATE,
  \`notes\` TEXT,
  \`total_amount\` DECIMAL(10,2) DEFAULT 0.00,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE SET NULL,
  FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 18. Purchase Order Items
CREATE TABLE IF NOT EXISTS \`purchase_order_items\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`po_id\` INT NOT NULL,
  \`product_id\` INT NOT NULL,
  \`quantity\` INT NOT NULL DEFAULT 1,
  \`received\` INT NOT NULL DEFAULT 0,
  \`cost\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (\`po_id\`) REFERENCES \`purchase_orders\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB;
`;

fs.appendFileSync('c:/SPOS/backend/spos_schema.sql', content);
