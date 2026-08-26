"""Supabase integration for Diabetes Risk Intelligence.

Handles authentication, database operations, and real-time subscriptions.
Set these environment variables:
  SUPABASE_URL — your Supabase project URL
  SUPABASE_KEY — your Supabase anon/public key
"""

import os
from datetime import datetime, timedelta
from typing import Optional

_supabase = None


def _get_client():
    """Lazy-init Supabase client."""
    global _supabase
    if _supabase is not None:
        return _supabase
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        _supabase = create_client(url, key)
        return _supabase
    except Exception:
        return None


def is_configured():
    """Check if Supabase is configured."""
    return _get_client() is not None


def get_current_user():
    """Get the currently logged-in user, or None."""
    client = _get_client()
    if not client:
        return None
    try:
        user = client.auth.get_user()
        return user.user if user and user.user else None
    except Exception:
        return None


def sign_in_with_google():
    """Initiate Google OAuth sign-in. Returns the URL to redirect to."""
    client = _get_client()
    if not client:
        return None
    try:
        result = client.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {"redirect_to": "http://localhost:8501"}
        })
        return result.url if result else None
    except Exception:
        return None


def sign_in_with_email(email: str, password: str):
    """Sign in with email and password."""
    client = _get_client()
    if not client:
        return None, "Supabase not configured"
    try:
        result = client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        return result.user if result else None, None
    except Exception as e:
        return None, str(e)


def sign_up_with_email(email: str, password: str):
    """Create a new account."""
    client = _get_client()
    if not client:
        return None, "Supabase not configured"
    try:
        result = client.auth.sign_up({
            "email": email,
            "password": password
        })
        return result.user if result else None, None
    except Exception as e:
        return None, str(e)


def sign_out():
    """Sign out the current user."""
    client = _get_client()
    if not client:
        return
    try:
        client.auth.sign_out()
    except Exception:
        pass


def save_screening(user_id: str, data: dict) -> bool:
    """Save a screening result to the database.
    
    data should contain:
      fasting_glucose, postmeal_glucose, hba1c, sbp, dbp, bmi,
      ldl, hdl, triglycerides, health_score, worst_severity,
      ml_score, red_flags (list of strings)
    """
    client = _get_client()
    if not client:
        return False
    try:
        row = {
            "user_id": user_id,
            "fasting_glucose": data.get("fasting_glucose"),
            "postmeal_glucose": data.get("postmeal_glucose"),
            "hba1c": data.get("hba1c"),
            "sbp": data.get("sbp"),
            "dbp": data.get("dbp"),
            "bmi": data.get("bmi"),
            "ldl": data.get("ldl"),
            "hdl": data.get("hdl"),
            "triglycerides": data.get("triglycerides"),
            "health_score": data.get("health_score"),
            "worst_severity": data.get("worst_severity"),
            "ml_score": data.get("ml_score"),
            "red_flags": data.get("red_flags", []),
            "created_at": datetime.utcnow().isoformat(),
        }
        client.table("screenings").insert(row).execute()
        return True
    except Exception:
        return False


def get_screening_history(user_id: str, limit: int = 50) -> list:
    """Get the user's screening history, newest first."""
    client = _get_client()
    if not client:
        return []
    try:
        result = (
            client.table("screenings")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data if result else []
    except Exception:
        return []


def get_screening_trends(user_id: str, days: int = 90) -> dict:
    """Get trend data for charts. Returns lists of dates and values."""
    client = _get_client()
    if not client:
        return {}
    try:
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        result = (
            client.table("screenings")
            .select("created_at,health_score,fasting_glucose,postmeal_glucose,sbp,dbp,bmi")
            .eq("user_id", user_id)
            .gte("created_at", cutoff)
            .order("created_at", desc=False)
            .execute()
        )
        rows = result.data if result else []
        if not rows:
            return {}
        return {
            "dates": [r["created_at"][:10] for r in rows],
            "health_scores": [r.get("health_score") for r in rows],
            "fasting_glucose": [r.get("fasting_glucose") for r in rows],
            "postmeal_glucose": [r.get("postmeal_glucose") for r in rows],
            "sbp": [r.get("sbp") for r in rows],
            "dbp": [r.get("dbp") for r in rows],
            "bmi": [r.get("bmi") for r in rows],
        }
    except Exception:
        return {}


def save_profile(user_id: str, data: dict) -> bool:
    """Save or update user profile."""
    client = _get_client()
    if not client:
        return False
    try:
        row = {
            "user_id": user_id,
            "display_name": data.get("display_name", ""),
            "age": data.get("age"),
            "sex": data.get("sex"),
            "units": data.get("units", "mg/dL"),
            "updated_at": datetime.utcnow().isoformat(),
        }
        # Upsert — insert or update
        client.table("profiles").upsert(row, on_conflict="user_id").execute()
        return True
    except Exception:
        return False


def get_profile(user_id: str) -> dict:
    """Get user profile."""
    client = _get_client()
    if not client:
        return {}
    try:
        result = (
            client.table("profiles")
            .select("*")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data if result else {}
    except Exception:
        return {}


def save_achievement(user_id: str, badge_type: str) -> bool:
    """Save an earned achievement."""
    client = _get_client()
    if not client:
        return False
    try:
        row = {
            "user_id": user_id,
            "badge_type": badge_type,
            "earned_at": datetime.utcnow().isoformat(),
        }
        client.table("achievements").insert(row).execute()
        return True
    except Exception:
        return False


def get_achievements(user_id: str) -> list:
    """Get all earned achievements."""
    client = _get_client()
    if not client:
        return []
    try:
        result = (
            client.table("achievements")
            .select("*")
            .eq("user_id", user_id)
            .order("earned_at", desc=True)
            .execute()
        )
        return result.data if result else []
    except Exception:
        return []


# SQL schema for Supabase dashboard
SCHEMA_SQL = """
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  age INT,
  sex TEXT,
  units TEXT DEFAULT 'mg/dL',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Screenings table
CREATE TABLE IF NOT EXISTS screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fasting_glucose FLOAT,
  postmeal_glucose FLOAT,
  hba1c FLOAT,
  sbp INT,
  dbp INT,
  bmi FLOAT,
  ldl FLOAT,
  hdl FLOAT,
  triglycerides FLOAT,
  health_score INT,
  worst_severity TEXT,
  ml_score FLOAT,
  red_flags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenings_user ON screenings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, earned_at DESC);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users own profiles" ON profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own screenings" ON screenings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own achievements" ON achievements
  FOR ALL USING (auth.uid() = user_id);
"""
