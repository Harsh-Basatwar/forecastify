import { SupabaseClient } from "@supabase/supabase-js";

export type ActivityType = 
  | "LOGIN" 
  | "PRODUCT_ADDED" 
  | "PRODUCT_EDITED"
  | "INVENTORY_UPDATED" 
  | "FORECAST_RUN" 
  | "ANALYSIS_GENERATED" 
  | "REPORT_DOWNLOADED" 
  | "VOICE_COMMAND"
  | "WEATHER_CHECKED"
  | "MARKET_INSIGHT_VIEWED";

export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  activityType: ActivityType,
  title: string,
  description?: string,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase.from("activity_logs").insert({
      user_id: userId,
      activity_type: activityType,
      activity_title: title,
      activity_description: description || null,
      metadata: metadata || {},
    });
    
    if (error) {
      console.error("Failed to log activity:", error);
    }
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}
