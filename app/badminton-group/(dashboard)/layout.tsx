import { redirect } from 'next/navigation';
import { createClient } from '@/lib/badminton/supabase/server';
import Navbar from '@/components/badminton/Navbar';
import type { Profile } from '@/types/badminton';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
            <Navbar profile={profile as Profile} />

            {/* Main Content */}
            <main className="lg:ml-[260px] pt-16 lg:pt-0">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
