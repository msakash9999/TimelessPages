# TimelessPages

TimelessPages is a bookstore web app with:

- A static frontend in `frontend/`
- A Node.js + Express backend in `backend/`
- MongoDB for data storage
- Cloudinary for image uploads

The backend also serves the frontend files, so the full app runs from a single server.

## Project Structure

```text
TimelessPages/
|- backend/
|  |- models/
|  |- server.js
|  |- seedAllBooks.js
|  |- package.json
|- frontend/
|  |- index.html
|  |- home.html
|  |- admin.html
|  |- seller-dashboard.html
```

## Prerequisites

Make sure these are installed before running the project:

- Node.js 18+ recommended
- npm
- MongoDB Atlas or a local MongoDB instance
- A Cloudinary account for image uploads

## Environment Setup

Create a `backend/.env` file with the following values:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_SECRET_KEY=your_cloudinary_secret_key

ADMIN_EMAIL=admin@timelesspages.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=TimelessPages Admin
```

Notes:

- `MONGODB_URI` is required for the backend to connect.
- Cloudinary keys are required if you want image upload from admin/seller pages to work.
- If you do not set the admin values, the app falls back to:
  `admin@timelesspages.com` / `admin123`

## Install Dependencies

Install backend dependencies:

```bash
cd backend
npm install
```

There is no required separate frontend install step for normal usage because the frontend is plain HTML/CSS/JS and is served by Express.

## Run the Project

Start the backend server from the `backend` folder:

```bash
cd backend
npm run dev
```

Or run without nodemon:

```bash
npm start
```

Once the server is running, open:

```text
http://localhost:5000
```

You can also visit pages directly, for example:

- `http://localhost:5000/index.html`
- `http://localhost:5000/home.html`
- `http://localhost:5000/admin-login.html`
- `http://localhost:5000/seller-login.html`

## Default Behavior on Startup

When the backend connects successfully:

- It seeds a default admin account if one does not already exist
- It seeds starter books if the books collection is empty

## Optional: Seed Full Book Data

To replace existing books and insert the larger seed dataset:

```bash
cd backend
node seedAllBooks.js
```

Important:

- This script deletes all existing books before inserting the full dataset.

## Main Features

- User registration/login
- Admin login
- Seller registration/login
- Add books
- Delete books
- Block/unblock sellers
- Upload book images with Cloudinary
- Browse books by category

## Useful Endpoints

- `GET /health` - health check
- `POST /add-user` - create or update a user
- `POST /login-user` - user login
- `POST /admin/login` - admin login
- `POST /seller-register` - seller signup
- `POST /seller-login` - seller login
- `GET /books` - list books
- `POST /books` - add a book
- `DELETE /books/:id` - delete a book
- `POST /upload` - upload an image

## Troubleshooting

If the app does not open:

- Make sure MongoDB is reachable from `MONGODB_URI`
- Make sure you started the server from the `backend` directory
- Make sure port `5000` is free, or change `PORT` in `backend/.env`

If images fail to upload:

- Check that `CLOUD_NAME`, `CLOUD_API_KEY`, and `CLOUD_SECRET_KEY` are correct

If the frontend loads but data does not appear:

- Confirm the backend is running on `http://localhost:5000`
- Check the browser console and backend terminal logs for API errors
