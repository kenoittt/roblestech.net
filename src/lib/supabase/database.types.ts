
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "cal_event_attendees": {
                  Row: {
                    "event_id": string,"response": string,"user_id": string
                  }
                  Insert: {
                    "event_id": string,"response"?: string,"user_id": string
                  }
                  Update: {
                    "event_id"?: string,"response"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cal_event_attendees_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "cal_events"
      referencedColumns: ["id"]
    }
                  ]
                },"cal_events": {
                  Row: {
                    "all_day": boolean,"auto_complete": boolean,"completed_at": string | null,"created_at": string,"ends_at": string,"id": string,"kind": string,"location": string | null,"notes": string | null,"owner_id": string,"starts_at": string,"task_id": string | null,"title": string,"updated_at": string,"visibility": string
                  }
                  Insert: {
                    "all_day"?: boolean,"auto_complete"?: boolean,"completed_at"?: string | null,"created_at"?: string,"ends_at": string,"id"?: string,"kind"?: string,"location"?: string | null,"notes"?: string | null,"owner_id"?: string,"starts_at": string,"task_id"?: string | null,"title": string,"updated_at"?: string,"visibility"?: string
                  }
                  Update: {
                    "all_day"?: boolean,"auto_complete"?: boolean,"completed_at"?: string | null,"created_at"?: string,"ends_at"?: string,"id"?: string,"kind"?: string,"location"?: string | null,"notes"?: string | null,"owner_id"?: string,"starts_at"?: string,"task_id"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cal_events_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "ppm_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"cal_privacy_ranges": {
                  Row: {
                    "created_at": string,"ends_on": string,"id": string,"mode": string,"starts_on": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"ends_on": string,"id"?: string,"mode": string,"starts_on": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_on"?: string,"id"?: string,"mode"?: string,"starts_on"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"change_requests": {
                  Row: {
                    "decided_at": string | null,"decided_by": string | null,"id": string,"kind": string,"note": string | null,"payload": NonNullable<Json>,"reason": string | null,"requested_at": string,"requested_by": string | null,"status": string
                  }
                  Insert: {
                    "decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"kind": string,"note"?: string | null,"payload"?: NonNullable<Json>,"reason"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"kind"?: string,"note"?: string | null,"payload"?: NonNullable<Json>,"reason"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"clients": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"gsc_data": NonNullable<Json>,"gsc_property": string | null,"gsc_updated_at": string | null,"id": string,"name": string
                  }
                  Insert: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"gsc_data"?: NonNullable<Json>,"gsc_property"?: string | null,"gsc_updated_at"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"gsc_data"?: NonNullable<Json>,"gsc_property"?: string | null,"gsc_updated_at"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"kb_articles": {
                  Row: {
                    "body": string,"category_id": string | null,"created_at": string,"created_by": string | null,"id": string,"keywords": string | null,"owner": string | null,"search": unknown,"slug": string,"status": string,"summary": string | null,"title": string,"topic_id": string | null,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "body"?: string,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"keywords"?: string | null,"owner"?: string | null,"search"?: never,"slug": string,"status"?: string,"summary"?: string | null,"title": string,"topic_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "body"?: string,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"keywords"?: string | null,"owner"?: string | null,"search"?: never,"slug"?: string,"status"?: string,"summary"?: string | null,"title"?: string,"topic_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "kb_articles_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "kb_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kb_articles_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "kb_topics"
      referencedColumns: ["id"]
    }
                  ]
                },"kb_categories": {
                  Row: {
                    "blurb": string | null,"color": string,"created_at": string,"id": string,"slug": string,"sort": number,"title": string
                  }
                  Insert: {
                    "blurb"?: string | null,"color"?: string,"created_at"?: string,"id"?: string,"slug": string,"sort"?: number,"title": string
                  }
                  Update: {
                    "blurb"?: string | null,"color"?: string,"created_at"?: string,"id"?: string,"slug"?: string,"sort"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"kb_feedback": {
                  Row: {
                    "article_id": string,"created_at": string,"helpful": boolean,"user_id": string
                  }
                  Insert: {
                    "article_id": string,"created_at"?: string,"helpful": boolean,"user_id": string
                  }
                  Update: {
                    "article_id"?: string,"created_at"?: string,"helpful"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "kb_feedback_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "kb_articles"
      referencedColumns: ["id"]
    }
                  ]
                },"kb_topics": {
                  Row: {
                    "category_id": string | null,"id": string,"slug": string,"sort": number,"title": string
                  }
                  Insert: {
                    "category_id"?: string | null,"id"?: string,"slug": string,"sort"?: number,"title": string
                  }
                  Update: {
                    "category_id"?: string | null,"id"?: string,"slug"?: string,"sort"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "kb_topics_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "kb_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"ppm_notifications": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"emailed_at": string | null,"event_id": string | null,"id": string,"meta": NonNullable<Json>,"read_at": string | null,"task_id": string | null,"type": string,"user_id": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"emailed_at"?: string | null,"event_id"?: string | null,"id"?: string,"meta"?: NonNullable<Json>,"read_at"?: string | null,"task_id"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"emailed_at"?: string | null,"event_id"?: string | null,"id"?: string,"meta"?: NonNullable<Json>,"read_at"?: string | null,"task_id"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ppm_notifications_event_fk"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "cal_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ppm_notifications_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "ppm_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"ppm_project_members": {
                  Row: {
                    "added_at": string,"added_by": string | null,"project_id": string,"role": string,"user_id": string
                  }
                  Insert: {
                    "added_at"?: string,"added_by"?: string | null,"project_id": string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "added_at"?: string,"added_by"?: string | null,"project_id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ppm_project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "ppm_projects"
      referencedColumns: ["id"]
    }
                  ]
                },"ppm_projects": {
                  Row: {
                    "archived": boolean,"client_name": string | null,"color": string | null,"created_at": string,"created_by": string | null,"default_view": string,"description": string | null,"id": string,"kind": string,"name": string,"owner_id": string | null,"start_date": string | null,"status": string,"target_date": string | null,"updated_at": string
                  }
                  Insert: {
                    "archived"?: boolean,"client_name"?: string | null,"color"?: string | null,"created_at"?: string,"created_by"?: string | null,"default_view"?: string,"description"?: string | null,"id"?: string,"kind"?: string,"name": string,"owner_id"?: string | null,"start_date"?: string | null,"status"?: string,"target_date"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "archived"?: boolean,"client_name"?: string | null,"color"?: string | null,"created_at"?: string,"created_by"?: string | null,"default_view"?: string,"description"?: string | null,"id"?: string,"kind"?: string,"name"?: string,"owner_id"?: string | null,"start_date"?: string | null,"status"?: string,"target_date"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ppm_task_checklist": {
                  Row: {
                    "created_at": string,"created_by": string | null,"done": boolean,"id": string,"sort": number,"task_id": string,"title": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"done"?: boolean,"id"?: string,"sort"?: number,"task_id": string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"done"?: boolean,"id"?: string,"sort"?: number,"task_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ppm_task_checklist_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "ppm_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"ppm_task_comments": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"edited_at": string | null,"id": string,"mentions": (string)[],"task_id": string
                  }
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"mentions"?: (string)[],"task_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"mentions"?: (string)[],"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ppm_task_comments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "ppm_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"ppm_task_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"from_status": string | null,"id": string,"meta": NonNullable<Json>,"task_id": string | null,"to_status": string | null,"type": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: string,"meta"?: NonNullable<Json>,"task_id"?: string | null,"to_status"?: string | null,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: string,"meta"?: NonNullable<Json>,"task_id"?: string | null,"to_status"?: string | null,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ppm_task_events_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "ppm_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"ppm_tasks": {
                  Row: {
                    "assigned_by": string | null,"assignee_id": string | null,"completed_at": string | null,"completed_by": string | null,"completion_approvers": (string)[],"completion_policy": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"deleted_by": string | null,"description": string | null,"due_date": string | null,"id": string,"is_private": boolean,"number": number,"priority": string,"project_id": string | null,"reviewer_id": string | null,"sort_order": number,"start_date": string | null,"status": string,"title": string,"updated_at": string,"ppm_completion_message": string | null
                  }
                  Insert: {
                    "assigned_by"?: string | null,"assignee_id"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"completion_approvers"?: (string)[],"completion_policy"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"is_private"?: boolean,"number"?: number,"priority"?: string,"project_id"?: string | null,"reviewer_id"?: string | null,"sort_order"?: number,"start_date"?: string | null,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_by"?: string | null,"assignee_id"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"completion_approvers"?: (string)[],"completion_policy"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"id"?: string,"is_private"?: boolean,"number"?: number,"priority"?: string,"project_id"?: string | null,"reviewer_id"?: string | null,"sort_order"?: number,"start_date"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ppm_tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "ppm_projects"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"client_id": string | null,"created_at": string,"deactivated_at": string | null,"email": string | null,"email_opt_out": boolean,"full_name": string | null,"id": string,"last_seen_at": string | null,"prefs": NonNullable<Json>,"role": string,"timezone": string,"title": string | null
                  }
                  Insert: {
                    "avatar_url"?: string | null,"client_id"?: string | null,"created_at"?: string,"deactivated_at"?: string | null,"email"?: string | null,"email_opt_out"?: boolean,"full_name"?: string | null,"id": string,"last_seen_at"?: string | null,"prefs"?: NonNullable<Json>,"role"?: string,"timezone"?: string,"title"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"client_id"?: string | null,"created_at"?: string,"deactivated_at"?: string | null,"email"?: string | null,"email_opt_out"?: boolean,"full_name"?: string | null,"id"?: string,"last_seen_at"?: string | null,"prefs"?: NonNullable<Json>,"role"?: string,"timezone"?: string,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "client_id": string,"created_at": string,"id": string,"period": string,"storage_path": string,"title": string
                  }
                  Insert: {
                    "client_id": string,"created_at"?: string,"id"?: string,"period": string,"storage_path": string,"title": string
                  }
                  Update: {
                    "client_id"?: string,"created_at"?: string,"id"?: string,"period"?: string,"storage_path"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cal_is_attendee":
{ Args: { "eid": string }; Returns: boolean
                           },
"cal_is_owner":
{ Args: { "eid": string }; Returns: boolean
                           },
"cal_team_events":
{ Args: { "range_end": string,"range_start": string }; Returns: {
              "all_day": boolean,"attendee_ids": (string)[],"auto_complete": boolean,"completed_at": string,"ends_at": string,"id": string,"kind": string,"location": string,"masked": boolean,"notes": string,"owner_id": string,"starts_at": string,"task_id": string,"title": string,"visibility": string
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_ppm_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"my_client_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"ppm_can_complete":
{ Args: { "t": Database["public"]['Tables']["ppm_tasks"]['Row'],"uid": string }; Returns: boolean
                           },
"ppm_can_manage_project":
{ Args: { "pid": string }; Returns: boolean
                           },
"ppm_completion_message":
{ Args: { "t": Database["public"]['Tables']["ppm_tasks"]['Row'] }; Returns: string
                           },
"ppm_notify":
{ Args: { "actor": string,"extra"?: Json,"kind": string,"recipient": string,"task": string }; Returns: undefined
                           },
"ppm_task_visible":
{ Args: { "tid": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
