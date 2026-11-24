# Sociao – Social Media Application

Sociao is an Instagram-inspired social media web application built using React and FastAPI. It allows users to create accounts, log in, view posts, create posts, and interact with content.

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Python, FastAPI
- Database: SQLite
- ORM: SQLAlchemy
- Authentication: Token-based authentication with Argon2 password hashing

## Project Structure

```text
sociao/
├── frontend/
│   └── src/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth_routes.py
│   ├── post_routes.py
│   ├── media_routes.py
│   └── seed.py
├── README.md
└── PROMPT_HISTORY.md
```

## How to Run the Project

### 1. Start the Backend

Open a terminal:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 2. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL displayed in the terminal, usually:

`http://localhost:5173`

If Vite selects another port, use the URL it displays.

## Database Schema

The application uses SQLite with SQLAlchemy.

| Table | Purpose |
|---|---|
| Users | Stores user account information |
| Posts | Stores posts created by users |
| Likes | Stores user likes on posts |
| LoginSession | Stores hashed authentication tokens and session information |

### Relationships

- One user can create multiple posts.
- One user can like multiple posts.
- One post can receive likes from multiple users.
- Each user can like a particular post only once.

## Implemented Features

- User registration and login.
- Password hashing using Argon2.
- Token-based authentication and logout.
- Session validation.
- Seed data for demo users and posts.
- Home feed with posts.
- Create posts.
- Like and unlike posts.
- Persistent database storage.
- Frontend integration with backend APIs.

## Pending / Not Yet Verified Features

- Comments and threaded replies.
- Stories and live functionality.
- Video viewer and interactions.
- Messaging inbox and chat functionality.
- Followers and following management.
- Edit profile functionality.
- Notifications and settings.
- Complete media upload and storage workflow.

*Note: Features listed as pending should be updated after their implementation and testing.*

## Future Improvements

- Complete the remaining assignment screens.
- Improve responsive design for mobile and desktop.
- Add media upload and storage.
- Implement additional social interactions.

## Project Status

Sociao is under active development. The authentication and basic post-management functionality have been implemented, while the remaining social media features are being developed and tested.