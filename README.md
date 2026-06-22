# EaseTrip (Travel Booking Platform)
## Introduction
This project is a **travel booking platform** developed using Node.js and Express. The system is designed to connect **hosts** who list accommodations, activities, and events with **customers** looking to book them.
The platform integrates a **MySQL database** to manage users, listings, and bookings, along with a **session-based authentication system** to control access for three distinct roles. When a customer books a listing, the system checks date availability, enforces a cancellation window, and automatically expires stale pending bookings.
Users can remotely check **live weather forecasts** for Malaysian cities through the **data.gov.my** public API, which is cached and displayed before they commit to a booking.

---

## System Scope
The scope of the EaseTrip system includes:
- Providing **role-based access control** for customers, hosts, and admins
- Being **secure**, with hashed passwords and parameterized SQL queries
- **Logging booking and listing data** to a relational database
- Allowing **remote weather lookups** through an external IoT-style data API

The system uses several modules to handle different responsibilities:
- **Auth Middleware** – verifies login state and role permissions before granting access
- **Upload Middleware** – validates and stores listing images
- **Booking Model** – checks date overlaps and manages booking status
- **Weather Model** – fetches and caches live forecast data

---

## System Functions
### User Authentication
**bcrypt** is used to hash user passwords before they are stored. A session cookie is issued on login and is checked on every request if the session is no longer valid, the system determines that the user is logged out.

### Role-Based Access
The **auth middleware** determines whether a user is a customer, host, or admin. Each role is granted different permissions, and unauthorized access attempts are redirected with a flash error message.

### Booking Availability
The **Booking model** checks the requested check-in and check-out dates against existing reservations. The system tracks overlapping date ranges and helps determine if a listing is available before confirming a booking.

### Listing Management
Hosts can create, update, and upload images for their listings through the **upload middleware** , which validates file type and size before saving.

### Weather Monitoring
The system integrates with **data.gov.my**, a Malaysian government open-data API, which:
- Fetches 7-day forecasts for supported cities
- Caches results in memory to reduce repeated external calls
- Displays real-time forecast status to customers before booking

This allows users to check expected weather conditions for their travel dates.

---

## Technologies Used
- Node.js
- Express.js
- MySQL (via `mysql2/promise`)
- bcryptjs
- express-session
- connect-flash
- Multer
- data.gov.my Weather Forecast API

---

# Project Setup
### 1. Extract the project
Locate and extract the project folder:
```
EaseTrip/
```

### 2. Update connection credentials
Modify the following file inside the code:
* `config/database.js`   # MySQL host, user, password, and database name

Replace the values with **your own credentials**.

### 3. Database setup
1. Start your MySQL server.
2. Import the schema:
   ```bash
   mysql -u root -p < database/user_data.sql
   ```

### 4. Install dependencies
```bash
npm install express mysql2 bcryptjs express-session connect-flash multer
```

### 5. Run the application
```bash
node app.js
```

### 6. Verify connection
Open a browser and visit:
```
http://localhost:3001
```
Check the terminal output to confirm a successful database connection.

---

## Disclaimer
This project was developed as part of an assignment.
The software implementation is provided as-is without any guarantees for real-world deployment. The system was tested within the scope of the academic project, and is not evaluated for production or commercial use.
Any usage of the code or design from this repository is done at the **user's own risk.**

---


