---
trigger: always_on
---

Act as a Principal Software Architect and Senior Full-Stack Engineer. I need to build a localized, high-resilience Restaurant Point of Sale (POS) system designed to run on a local server (Windows/Linux PC) and serve an Android tablet interface via a local network, with secure remote monitoring capabilities. 

Generate a comprehensive implementation blueprint, system architecture, MySQL database schema, and core code boilerplate for this system based on the following specific requirements:

### 1. SYSTEM ARCHITECTURE & ENVIRONMENT
*   Frontend: ReactJS (Single Page Application structured for dense, high-utility tablet grid layouts).
*   Backend: Node.js (Express) or Python (FastAPI) [Choose the best fit for local lightweight performance].
*   Database: MySQL (Running locally on the server PC using the InnoDB engine for transactional safety and ACID compliance).
*   Local Infrastructure: Dedicated local Wi-Fi router. The tablet connects directly to the local server PC via Local Static IP (e.g., http://192.168.1.50:5000).
*   Remote Infrastructure: Cloudflare Tunnel routing traffic from a custom domain (e.g., ://myrestaurant.com) to the same local server PC for off-site remote monitoring.

### 2. RESILIENCE & NETWORKING SPECIFICATIONS
*   Local Offline Mode: The tablet interface must communicate exclusively via the local network IP so that if the outside internet goes down, the POS functions 100% locally without interruption.
*   Hybrid Synchronization: Provide a strategy for how the MySQL server handles incoming remote dashboard queries from the domain without locking up local database transactions during busy restaurant hours.
*   Security: Ensure the local API endpoints used by the tablet are secure, and detail how to lock down the Cloudflare Tunnel route so only authorized managers can access the dashboard remotely.

### 3. WHAT TO GENERATE

Please deliver the following structural components:

#### A. MySQL Database Schema Blueprint
*   Provide optimized MySQL DDL script for core tables: `menu_items`, `orders`, `order_items`, `tables`, `payments`, and `users/staff`.
*   Use explicit InnoDB engine declarations and foreign key constraints.
*   Include proper indexing (`INDEX`) for high-frequency daily transactional queries (e.g., fetching open tabs, running daily totals).

#### B. Backend Architecture & Network Config
*   Provide a production-ready template for the main server setup (CORS configurations allowing both local IP network traffic and the Cloudflare proxy domain).
*   Write a sample MySQL database connection pool module.
*   Write a sample API endpoint for order creation that uses explicit MySQL database TRANSACTIONS (`START TRANSACTION`, `COMMIT`, `ROLLBACK`) to prevent corrupted or double-submitted orders.

#### C. ReactJS Frontend Layout & State Structure
*   Outline a highly scannable, dense layout structure suited for an Android Tablet (Grid format: Categories sidebar -> Items Menu grid -> Active Ticket/Checkout sidebar).
*   Provide a React Context or state management template that cleanly separates "POS Cashier Actions" from "Remote Manager Analytics".

#### D. Step-by-Step Deployment & Hardware Guide
*   List the exact steps to configure the local server PC with a static IP.
*   Provide instructions for setting up a Cloudflare Tunnel daemon on the server PC.
*   Detail how to deploy the ReactJS app locally so the Android tablet can access it via Chrome's "Add to Home Screen" web-app mode.
