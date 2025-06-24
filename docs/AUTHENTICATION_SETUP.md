# Authentication System Documentation

## Overview
This application uses Supabase for authentication with email/password login, role-based access control (RBAC), and subscription management.

## Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  subscription_status text DEFAULT 'inactive' NOT NULL,
  subscription_plan text,
  subscription_expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

### User Roles Enum
```sql
CREATE TYPE user_role AS ENUM ('user', 'subscriber', 'moderator', 'administrator');
```

## Row Level Security (RLS) Policies

### User Profile Access
- **Users can read own profile**: `auth.uid() = id`
- **Users can update own profile**: `auth.uid() = id`
- **Users can insert own profile**: `auth.uid() = id`
- **Admins can read all profiles**: Role-based access for administrators and moderators

### Automatic Profile Creation
A trigger automatically creates a profile when a user signs up:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Authentication Flow

### 1. Sign Up
- User provides email, password, and optional full name
- Supabase creates auth user
- Trigger automatically creates profile with role 'user'
- User is immediately signed in (no email confirmation required)

### 2. Sign In
- User provides email and password
- System fetches user profile with role information
- Auth state is updated globally via React Context

### 3. Role-Based Access
- **User**: Basic access to public features
- **Subscriber**: Access to premium features (€2.99/month)
- **Moderator**: Can manage fact codes and suggestions
- **Administrator**: Full system access

## Components

### AuthContext
Global authentication state management with:
- User profile and role information
- Authentication methods (signIn, signUp, signOut)
- Profile management (updateProfile, changePassword)
- Subscription management (subscribe, cancelSubscription)

### ProtectedRoute
Wrapper component for route protection:
```tsx
<ProtectedRoute requiredRole={['moderator', 'administrator']}>
  <AdminPanel />
</ProtectedRoute>
```

### UserMenu
Dropdown menu showing:
- User information and role badge
- Navigation to profile settings
- Admin panel access (for moderators/admins)
- Sign out option

## Testing Instructions

### 1. User Registration
1. Click "Inloggen" in header
2. Switch to "Registreren" tab
3. Fill in email, password, and optional name
4. Submit form
5. Verify user is immediately logged in
6. Check that profile is created with 'user' role

### 2. Role Detection
1. Log in as different user types
2. Verify role badges display correctly
3. Test access to admin panel (moderators/admins only)
4. Verify subscription features work

### 3. Profile Management
1. Navigate to `/profile`
2. Test profile editing (name, email)
3. Test password change
4. Test subscription flow
5. Test subscription cancellation

### 4. Subscription Flow
1. Go to Profile → Abonnement tab
2. Click "Abonneren voor €2.99/maand"
3. Verify subscription status updates
4. Test cancellation with confirmation dialog

## Environment Variables
Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Security Features
- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure password requirements (minimum 6 characters)
- Protected routes with proper fallbacks
- Automatic profile creation on signup
- Session persistence across page refreshes

## Future Enhancements
- Stripe integration for real payment processing
- Email verification for enhanced security
- Password reset functionality
- Two-factor authentication
- User management interface for administrators