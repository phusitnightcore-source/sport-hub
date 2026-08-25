import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reviewSchema = z.object({
  entity_type: z.enum(["facility", "coach"]),
  target_id: z.string().uuid(),
  rating_overall: z.coerce.number().min(1).max(5),
  rating_cleanliness: z.coerce.number().min(1).max(5).optional().or(z.literal("").transform(() => undefined)),
  rating_court: z.coerce.number().min(1).max(5).optional().or(z.literal("").transform(() => undefined)),
  rating_service: z.coerce.number().min(1).max(5).optional().or(z.literal("").transform(() => undefined)),
  comment: z.string().optional(),
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
      entity_type: formData.get("entity_type"),
      target_id: formData.get("target_id"),
      rating_overall: formData.get("rating_overall"),
      rating_cleanliness: formData.get("rating_cleanliness"),
      rating_court: formData.get("rating_court"),
      rating_service: formData.get("rating_service"),
      comment: formData.get("comment"),
    };

    const parsed = reviewSchema.parse(payload);
    const admin = createAdminClient();

    // Verification: User must have a completed booking
    if (parsed.entity_type === "facility") {
      // Check for completed facility booking
      // For facility bookings, we look at bookings table joined with courts to match the tenant_id
      const { data: hasBooking } = await admin
        .from("bookings")
        .select(`id, courts!inner(branch_id, branches!inner(tenant_id))`)
        .eq("profile_id", user.id)
        .eq("status", "confirmed")
        .eq("courts.branches.tenant_id", parsed.target_id)
        .limit(1)
        .maybeSingle();

      if (!hasBooking) {
        return NextResponse.redirect(new URL("/me/reviews?error=no_completed_booking", request.url));
      }
    } else {
      // Check for completed coach booking
      const { data: hasCoachBooking } = await admin
        .from("coach_bookings")
        .select("id")
        .eq("player_profile_id", user.id)
        .eq("coach_profile_id", parsed.target_id)
        .in("status", ["confirmed", "completed"]) // assuming these statuses mean they had a session
        .limit(1)
        .maybeSingle();
      
      if (!hasCoachBooking) {
        return NextResponse.redirect(new URL("/me/reviews?error=no_completed_booking", request.url));
      }
    }

    // The database will check for duplicates based on the unique constraint (reviewer_id, entity_type, target_id)
    const insertData: any = {
      reviewer_id: user.id,
      entity_type: parsed.entity_type,
      rating_overall: parsed.rating_overall,
      comment: parsed.comment || null,
      is_visible: true
    };

    if (parsed.entity_type === "facility") {
      insertData.facility_id = parsed.target_id;
      insertData.rating_cleanliness = parsed.rating_cleanliness;
      insertData.rating_court = parsed.rating_court;
      insertData.rating_service = parsed.rating_service;
    } else {
      insertData.coach_id = parsed.target_id;
    }

    const { error } = await admin.from("reviews").insert(insertData);

    if (error) {
      console.error("Review insert error:", error);
      // Fallback for duplicates or other errors
      return NextResponse.redirect(new URL("/me/reviews?error=failed", request.url));
    }

    // Success, return to my reviews page
    return NextResponse.redirect(new URL("/me/reviews?success=true", request.url), 303);
    
  } catch (error) {
    console.error("Invalid review submission:", error);
    return NextResponse.redirect(new URL("/me/reviews?error=invalid_form", request.url));
  }
}
