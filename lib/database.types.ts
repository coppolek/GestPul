export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          first_name: string
          last_name: string
          role: string
          contract_type: string
          start_date: string
          end_date: string | null
          medical_visit_expiry: string
          phone: string
          email: string
          address: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          role: string
          contract_type: string
          start_date: string
          end_date?: string | null
          medical_visit_expiry: string
          phone: string
          email: string
          address: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          role?: string
          contract_type?: string
          start_date?: string
          end_date?: string | null
          medical_visit_expiry?: string
          phone?: string
          email?: string
          address?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      work_sites: {
        Row: {
          id: string
          name: string
          client: string
          address: string
          start_date: string
          end_date: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          client: string
          address: string
          start_date: string
          end_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          client?: string
          address?: string
          start_date?: string
          end_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      site_assignments: {
        Row: {
          id: string
          site_id: string
          employee_id: string
          working_hours: string
          working_days: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          employee_id: string
          working_hours: string
          working_days: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          employee_id?: string
          working_hours?: string
          working_days?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          employee_id: string
          type: string
          start_date: string
          end_date: string
          reason: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          type: string
          start_date: string
          end_date: string
          reason?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          type?: string
          start_date?: string
          end_date?: string
          reason?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      sickness_records: {
        Row: {
          id: string
          employee_id: string
          start_date: string
          end_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          start_date: string
          end_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          start_date?: string
          end_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          employee_id: string | null
          label: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id?: string | null
          label: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string | null
          label?: string
          created_at?: string
          updated_at?: string
        }
      }
      schedule_assignments: {
        Row: {
          id: string
          schedule_id: string
          assignment_date: string
          site_id: string
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          assignment_date: string
          site_id: string
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          assignment_date?: string
          site_id?: string
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
