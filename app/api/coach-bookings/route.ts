import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const formSchema = z.object({
  coach_profile_id: z.string().uuid(),
  service_id: z.string().uuid(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string(),
  end_time: z.string(),
  location_note: z.string().min(1),
  player_note: z.string().optional(),
  total_price: z.coerce.number().min(0),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const formData = await request.formData();
    const payload = {
      coach_profile_id: formData.get("coach_profile_id"),
      service_id: formData.get("service_id"),
      booking_date: formData.get("booking_date"),
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
      location_note: formData.get("location_note"),
      player_note: formData.get("player_note"),
      total_price: formData.get("total_price"),
    };

    const parsed = formSchema.parse(payload);
    const admin = createAdminClient();

    // Verify service belongs to coach
    const { data: service } = await admin
      .from("coach_services")
      .select("id, coach_profile_id")
      .eq("id", parsed.service_id)
      .eq("coach_profile_id", parsed.coach_profile_id)
      .single();

    if (!service) {
      return NextResponse.redirect(new URL("/discover?error=service_not_found", request.url));
    }

    // Insert booking
    const { error } = await admin.from("coach_bookings").insert({
      coach_profile_id: parsed.coach_profile_id,
      player_profile_id: user.id,
      service_id: parsed.service_id,
      booking_date: parsed.booking_date,
      start_time: parsed.start_time,
      end_time: parsed.end_time,
      location_note: parsed.location_note,
      player_note: parsed.player_note || null,
      total_price: parsed.total_price,
      status: "requested",
    });

    if (error) {
      console.error("Coach booking error:", error);
      return NextResponse.redirect(new URL(`/coaches/${parsed.coach_profile_id}?error=booking_failed`, request.url));
    }

    // Redirect to the user's tracking page
    return NextResponse.redirect(new URL("/track?success=coach_booking_requested", request.url), 303);
    
  } catch (error) {
    console.error("Invalid form submission:", error);
    return NextResponse.redirect(new URL("/discover?error=invalid_form", request.url));
  }
}
