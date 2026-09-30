# SPOS Restaurant Point of Sale

SPOS is a local-first restaurant point-of-sale system with a cashier terminal, a back-office dashboard, a Node.js API, and a MySQL database. This guide is written for a pilot installation on a Windows PC at the restaurant, with POS tablets connected through the same local Wi-Fi network.

> **Pilot status:** This repository is suitable for supervised pilot testing. It still uses development web servers and application passwords/PINs are not cryptographically hashed. Do not expose the POS directly to the public internet or treat this as a production deployment without a security and deployment review.

## System layout

```text
Android tablet or cashier PC
        |
        | http://SERVER-IP:5173
        v
POS React app (Vite) ---- /api and /uploads ----+
                                                  |
Back-office browser                               v
        | http://SERVER-IP:5174/admin       Node/Express API :5000
        v                                         |
Admin React app (Vite) ---- /api and /uploads ----+
                                                  |
                                                  v
                                           MySQL / SPOS_db
```

The POS remains usable across the local network when the internet connection is unavailable. The restaurant PC, Wi-Fi router, and tablets must remain powered and connected.

| Component | Directory | Port | Purpose |
| --- | --- | ---: | --- |
| Main API | `backend` | 5000 | All current POS and admin API routes |
| POS frontend | `pos_frontend` | 5173 | Cashier/tablet interface |
| Admin frontend | `frontend` | 5174 | Back-office dashboard |
| MySQL | external service | 3306 | Transaction and configuration data |

`pos_backend` is an older prototype and is not used by the current frontends. Do not start it for the pilot.

## 1. Requirements

Install these on the restaurant server PC:

- Windows 10 or 11, preferably with a wired Ethernet connection to the restaurant router.
- Git.
- Node.js 22.12 or newer. Node 20.19.x also satisfies the current Vite engine requirement.
- MySQL Community Server 8.0 or newer, including MySQL Command Line Client or MySQL Workbench.
- A dedicated private Wi-Fi router shared by the server PC and POS tablets.

Verify the command-line tools in PowerShell:

```powershell
git --version
node --version
npm --version
mysql --version
```

If `mysql` is not in `PATH`, use the full executable path. A typical MySQL Installer path is:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --version
```

## 2. Download the project

```powershell
git clone https://github.com/princeravenver01/SPOS.git
cd SPOS
```

If the repository is already on the PC:

```powershell
cd C:\path\to\SPOS
git pull
```

## 3. Install Node.js dependencies

Run `npm ci` in each active application directory. It uses the committed lockfiles so every pilot PC receives the same dependency versions.

```powershell
cd backend
npm ci

cd ..\frontend
npm ci

cd ..\pos_frontend
npm ci

cd ..
```

Do not install or start `pos_backend`; it is retained only as legacy source code.

## 4. Configure MySQL

### Start MySQL

If MySQL was installed as the standard Windows service:

```powershell
Get-Service *MySQL*
Start-Service MySQL80
```

Run PowerShell as Administrator if `Start-Service` reports an access error. If MySQL came from XAMPP, start MySQL from the XAMPP Control Panel instead.

### Create the database and application account

Open MySQL as the MySQL administrator:

```powershell
mysql -u root -p
```

If necessary, use the full path:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

At the `mysql>` prompt, run the following. Replace the example password with a unique password and keep the quotation marks.

```sql
CREATE DATABASE IF NOT EXISTS SPOS_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'spos_app'@'localhost'
  IDENTIFIED BY 'replace-with-a-strong-password';

GRANT ALL PRIVILEGES ON SPOS_db.* TO 'spos_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

The application account is local-only. MySQL port 3306 should not be opened to the Wi-Fi network or the internet.

### Create the backend environment file

From the repository root:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Set the values to match the account created above:

```dotenv
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=spos_app
DB_PASSWORD=replace-with-a-strong-password
DB_NAME=SPOS_db
CORS_ORIGINS=
```

`CORS_ORIGINS` may contain comma-separated, explicitly trusted HTTPS dashboard origins if a later deployment calls the API directly. Leave it empty for the local pilot; private LAN origins on frontend ports 5173 and 5174 are handled automatically.

Do not commit `backend/.env`. It is ignored by Git. Share credentials through a password manager, not chat or source control.

### Build the database schema and seed the pilot account

```powershell
cd backend
npm run db:setup
cd ..
```

Successful output ends with:

```text
Database setup completed successfully: SPOS_db
```

For a database created by this version, the command is non-destructive and may be run again; it preserves existing records. It is a fresh-install bootstrap, not a general migration tool. If it detects tables from an incompatible older schema, it stops with an explanatory error instead of partially changing the database. For a new installation it also adds:

- Branch: `Main Branch`
- Admin username: `admin`
- Admin back-office password: `admin123`
- Admin POS PIN: `1234`
- Dining options: `Dine In` and `Takeout`
- Payment type: `Cash`
- POS page: `Page 1`

Change the default password and PIN immediately after the first login.

> Use only `npm run db:setup` for a fresh pilot database. Files such as `backend/schema.sql`, `backend/spos_schema.sql`, and the older individual migration scripts are historical development artifacts. Some are destructive or represent older table layouts. An existing installation made before this bootstrap needs a release-specific, developer-reviewed data migration.

## 5. Configure the restaurant network

### Give the server PC a stable address

The recommended method is a DHCP reservation in the router:

1. On the server PC, run `ipconfig /all`.
2. Record the Ethernet adapter's physical address and current IPv4 address.
3. Sign in to the router and create a DHCP reservation for that physical address, for example `192.168.1.50`.
4. Restart the PC or run `ipconfig /renew`.
5. Confirm that `ipconfig` still shows the reserved address.

A router reservation avoids IP conflicts better than manually assigning an address in Windows. If the site router cannot reserve addresses, configure a manual IPv4 address outside its DHCP pool and record the address, gateway, subnet mask, and DNS values in the site handover notes.

### Set the Windows network profile and firewall

The restaurant network must be marked **Private**, not Public. In an Administrator PowerShell window, allow only the two frontend ports:

```powershell
New-NetFirewallRule `
  -DisplayName "SPOS Pilot Frontends" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 5173,5174 `
  -Action Allow `
  -Profile Private
```

Port 5000 does not need to be open to tablets because the frontend servers proxy API requests locally. Do not expose MySQL port 3306.

Make sure the router does not enable **AP isolation**, **client isolation**, or a guest-network rule that prevents tablets from reaching the server PC.

## 6. Start SPOS

### Windows launcher

Double-click `start_all.bat`, or run:

```powershell
.\start_all.bat
```

Three terminal windows remain open:

- `SPOS API`
- `SPOS Admin`
- `SPOS POS`

Closing one of these windows stops that component.

### Manual start on Windows, Linux, or macOS

Open three terminals at the repository root.

Terminal 1:

```powershell
cd backend
npm start
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Terminal 3:

```powershell
cd pos_frontend
npm run dev
```

## 7. Open and verify the applications

On the server PC:

- POS: <http://localhost:5173>
- Admin login: <http://localhost:5174/admin>

On a tablet, replace `localhost` with the reserved server IPv4 address:

- POS: `http://192.168.1.50:5173`
- Admin: `http://192.168.1.50:5174/admin`

Replace `192.168.1.50` if the site uses a different address.

Verify the API through the frontend proxy from the server and then from a tablet:

```text
http://SERVER-IP:5173/api/branches
```

A working installation returns JSON containing `Main Branch`.

### First login

Back office:

- Username: `admin`
- Password: `admin123`

POS:

- Employee: `admin`
- PIN: `1234`

In the admin dashboard, open **Employees**, edit the administrator, and replace both defaults. Create a separate cashier account and assign it to `Main Branch` before live pilot transactions.

## 8. Pilot configuration order

Complete these steps in the admin dashboard before taking test orders:

1. **Settings → Branches:** verify the restaurant name, address, and receipt settings.
2. **Settings → Areas/Tables:** create dining areas and tables.
3. **Settings → Payments/Dining Options:** confirm the accepted payment methods and dining types.
4. **Employees:** create each pilot user, choose a role, assign the correct branch, and give each user a unique PIN.
5. **Categories and Products:** add the pilot menu, prices, SKUs, stock options, modifiers, and discounts.
6. **POS Pages:** arrange the cashier grid.
7. **Printers:** add counter or kitchen printer IP addresses only after each printer has a reserved LAN address. Most supported network receipt printers use raw TCP port 9100.

Then run this smoke test:

1. Sign in to the POS with the cashier account.
2. Open a shift with a starting cash amount.
3. Create and save an open table ticket.
4. Reopen the ticket, add an item, and check it out with Cash.
5. Confirm the receipt appears in POS history and admin reports.
6. Close the shift and verify the expected/actual cash report.
7. Disconnect the internet connection while leaving the router powered; repeat a test sale to confirm local offline operation.

Do not begin the pilot until all seven checks pass. If inventory tracking is part of the pilot, separately create a stock adjustment and verify it appears in inventory history; checkout currently does not automatically deduct product stock.

## 9. Tablet setup

1. Connect the Android tablet to the same private Wi-Fi network as the server.
2. In Chrome, open `http://SERVER-IP:5173`.
3. Sign in and complete one test transaction.
4. Open Chrome's menu and select **Add to Home screen** for a convenient launcher.
5. Disable aggressive battery saving for Chrome if the device suspends the live table screen.
6. Keep a charger available at the POS station.

The current application is a web app, not a fully installable offline PWA. The router and server must remain reachable even when the outside internet is disconnected.

## 10. Backup and restore

Create a backup directory outside the repository. Run a backup before upgrades and at the end of every pilot day:

```powershell
New-Item -ItemType Directory -Force C:\SPOS-backups
$backupStamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
mysqldump -u spos_app -p --single-transaction --routines --triggers --result-file="C:\SPOS-backups\SPOS_db-$backupStamp.sql" SPOS_db
```

`--result-file` ensures that `mysqldump` writes the SQL file with the correct encoding in Windows PowerShell. Copy backups to an encrypted external drive or approved secure storage.

Restore only into an empty or intentionally replaceable database. Restoring can overwrite newer data:

```powershell
mysql -u root -p -e "DROP DATABASE IF EXISTS SPOS_restore; CREATE DATABASE SPOS_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p SPOS_restore -e "source C:/SPOS-backups/SPOS_db-YYYY-MM-DD-HHMMSS.sql"
```

Validate a backup by restoring it to `SPOS_restore`; do not test restoration against the live `SPOS_db` database.

## 11. Optional protected remote admin access

Remote access is not required for local POS operation. Keep the POS URL on the local network. If remote dashboard access is required, use a **named Cloudflare Tunnel** to the admin frontend only and protect it with a Cloudflare Access self-hosted application before publishing the hostname.

Recommended pilot sequence:

1. Add the intended dashboard hostname as a Cloudflare Access self-hosted application.
2. Create a named tunnel in Cloudflare Zero Trust.
3. Add a published application route from the protected hostname to `http://localhost:5174`.
4. Install `cloudflared` as a Windows service using the token command provided by the Cloudflare dashboard.
5. Create an Access Allow policy limited to the named pilot managers or the organization's identity provider.
6. Verify an unauthorized private browser session is denied before sharing the hostname.

Do not use a temporary Quick Tunnel for the pilot. The application uses Server-Sent Events for live ticket updates, and Cloudflare documents that Quick Tunnels do not support SSE. See the official [Cloudflare Tunnel setup guide](https://developers.cloudflare.com/tunnel/get-started/), [Windows service guide](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/as-a-service/windows/), and [Access self-hosted application guide](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).

Cloudflare Access protects the outer route but does not correct application-level security limitations. A production deployment still requires HTTPS-aware hosting, proper password hashing, authenticated API sessions, authorization checks, rate limiting, audit logs, and a security review.

## 12. Updating the pilot installation

Stop all three SPOS terminal windows and back up the database first. Then run:

```powershell
git pull

cd backend
npm ci

cd ..\frontend
npm ci

cd ..\pos_frontend
npm ci

cd ..
.\start_all.bat
```

Do not run `npm run db:setup`, historical SQL, or migration files as a generic update step. First read the release handover notes. Run a database command only when that release explicitly says it is compatible with the installed schema or provides a tested migration. For this pilot handover, provision a fresh database using Section 4.

## 13. Troubleshooting

### `Access denied for user` during database setup

- Confirm `DB_USER` and `DB_PASSWORD` in `backend/.env`.
- Confirm the account was created as `'spos_app'@'localhost'`.
- Run `mysql -u spos_app -p SPOS_db` to test the same credentials directly.

### `ECONNREFUSED 127.0.0.1:3306`

MySQL is stopped or listening on a different port. Check:

```powershell
Get-Service *MySQL*
Get-NetTCPConnection -LocalPort 3306 -State Listen
```

Update `DB_PORT` if the local MySQL installation intentionally uses another port.

### Port 5000, 5173, or 5174 is already in use

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5000,5173,5174 |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Close the old SPOS terminal window or identify the owning process before stopping anything.

### The server works, but the tablet cannot open SPOS

- Use the server's IPv4 address, not `localhost`.
- Confirm both devices are on the same non-guest network.
- Confirm the server network profile is Private.
- Confirm the firewall rule covers ports 5173 and 5174.
- Check for router AP/client isolation.
- From another PC, try `ping SERVER-IP` and then open `http://SERVER-IP:5173`.

### The page opens, but lists are empty or requests fail

- Check that the `SPOS API` window is still running.
- Open `http://SERVER-IP:5173/api/branches`; it should return JSON.
- Check the API terminal for the first database error.
- For a fresh empty database, re-run `cd backend` followed by `npm run db:setup`.
- If setup reports an incompatible older schema, stop. Keep the backup and request a release-specific data migration; do not run the historical SQL files.

### Frontend build check

```powershell
cd frontend
npm run build

cd ..\pos_frontend
npm run build
```

Both commands must finish successfully before deploying an update to the pilot site.

## Pilot handover record

The on-site co-developer should record these items somewhere secure and accessible to the project team:

- Server PC name and reserved IPv4 address.
- Router administrator/owner contact; do not put the router password in this repository.
- MySQL service name and backup location.
- Pilot branch and POS device names.
- Printer IP addresses and physical locations.
- Date and result of the seven-step smoke test.
- Date, filename, and storage location of the latest verified backup.
- Any errors, screenshots, and the exact action that produced them.
