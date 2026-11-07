'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { HeartPulse, ShieldCheck, ArrowRight, UserCheck, Lock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function SignInPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link href="/" className="inline-flex items-center gap-2.5 justify-center">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
            <HeartPulse className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Diabetes<span className="text-blue-600">Risk</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Patient & Clinician Portal
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Sign in with your Google account to track your individual screenings, lab reports, and longitudinal health trends.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-10 space-y-6">
          <SignedIn>
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
              <p className="text-xs text-emerald-600 font-semibold">
                You are currently signed in.
              </p>
              <Button asChild className="w-full h-10 text-xs font-bold gap-2">
                <Link href="/screening">
                  Go to Clinical Screening <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </SignedIn>

          <SignedOut>
            <div className="space-y-4">
              {clerkEnabled ? (
                <SignInButton mode="modal">
                  <Button className="w-full h-11 text-xs font-bold gap-3 shadow-sm bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Continue with Google
                  </Button>
                </SignInButton>
              ) : (
                <div className="space-y-3">
                  <Button asChild className="w-full h-11 text-xs font-bold gap-3 shadow-sm bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <Link href="/screening">
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Sign In with Google (Active Demo)
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </SignedOut>

          {/* Privacy & Security Features */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2.5 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Isolated patient profiles & history records</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Encrypted medical diagnostic privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span>ICMR-INDIAB & RSSDI clinical protocol</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
