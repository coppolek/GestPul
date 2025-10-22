/*
  # Create Initial Database Schema for Personnel Management System

  ## Overview
  This migration sets up the complete database structure for a cleaning personnel management system,
  including employees, work sites, site assignments, leave requests, sickness records, and schedules.

  ## New Tables

  ### 1. `employees`
  Stores employee information including personal details, contract information, and medical visit expiry.
  - `id` (uuid, primary key) - Unique employee identifier
  - `first_name` (text) - Employee first name
  - `last_name` (text) - Employee last name
  - `role` (text) - Job role (Operatore, Jolly, Impiegato)
  - `contract_type` (text) - Contract type (Tempo Indeterminato, Tempo Determinato)
  - `start_date` (date) - Employment start date
  - `end_date` (date, nullable) - Contract end date for temporary contracts
  - `medical_visit_expiry` (date) - Medical visit expiration date
  - `phone` (text) - Contact phone number
  - `email` (text) - Email address
  - `address` (text) - Physical address
  - `notes` (text, nullable) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### 2. `work_sites`
  Stores information about cleaning work sites.
  - `id` (uuid, primary key) - Unique site identifier
  - `name` (text) - Site name
  - `client` (text) - Client name
  - `address` (text) - Site address
  - `start_date` (date) - Site start date
  - `end_date` (date, nullable) - Site end date
  - `status` (text) - Site status (In Corso, Completato, Sospeso)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### 3. `site_assignments`
  Stores employee assignments to work sites with working hours and days.
  - `id` (uuid, primary key) - Unique assignment identifier
  - `site_id` (uuid, foreign key) - References work_sites.id
  - `employee_id` (uuid, foreign key) - References employees.id
  - `working_hours` (text) - Working hours (e.g., "08:00 - 17:00")
  - `working_days` (text[]) - Array of working days
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### 4. `leave_requests`
  Stores employee leave requests (vacation, permits, etc.).
  - `id` (uuid, primary key) - Unique request identifier
  - `employee_id` (uuid, foreign key) - References employees.id
  - `type` (text) - Leave type (Ferie, Permesso, Malattia Bambino, Altro)
  - `start_date` (date) - Leave start date
  - `end_date` (date) - Leave end date
  - `reason` (text, nullable) - Reason for leave
  - `status` (text) - Request status (In Attesa, Approvato, Rifiutato)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### 5. `sickness_records`
  Stores employee sickness/illness records.
  - `id` (uuid, primary key) - Unique record identifier
  - `employee_id` (uuid, foreign key) - References employees.id
  - `start_date` (date) - Sickness start date
  - `end_date` (date) - Sickness end date
  - `notes` (text, nullable) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### 6. `schedules`
  Stores jolly employee schedules and assignments.
  - `id` (uuid, primary key) - Unique schedule identifier
  - `employee_id` (uuid, foreign key, nullable) - References employees.id
  - `label` (text) - Schedule label/name
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### 7. `schedule_assignments`
  Stores individual assignments within a schedule.
  - `id` (uuid, primary key) - Unique assignment identifier
  - `schedule_id` (uuid, foreign key) - References schedules.id
  - `assignment_date` (date) - Date of assignment
  - `site_id` (uuid, foreign key) - References work_sites.id
  - `start_time` (text) - Start time
  - `end_time` (text) - End time
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ## Security
  - Row Level Security (RLS) is enabled on all tables
  - Public access policies allow all operations for authenticated and anonymous users
  - In production, these policies should be restricted based on user roles and permissions

  ## Indexes
  - Foreign key indexes for improved query performance
  - Date indexes for filtering by date ranges
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL,
  contract_type text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  medical_visit_expiry date NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work_sites table
CREATE TABLE IF NOT EXISTS work_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text NOT NULL,
  address text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'In Corso',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create site_assignments table
CREATE TABLE IF NOT EXISTS site_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  working_hours text NOT NULL,
  working_days text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'In Attesa',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sickness_records table
CREATE TABLE IF NOT EXISTS sickness_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create schedule_assignments table
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  assignment_date date NOT NULL,
  site_id uuid NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_site_assignments_site_id ON site_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_assignments_employee_id ON site_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sickness_records_employee_id ON sickness_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_sickness_records_dates ON sickness_records(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedules_employee_id ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_id ON schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_date ON schedule_assignments(assignment_date);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sickness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees
CREATE POLICY "Allow public access to employees"
  ON employees FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for work_sites
CREATE POLICY "Allow public access to work_sites"
  ON work_sites FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for site_assignments
CREATE POLICY "Allow public access to site_assignments"
  ON site_assignments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for leave_requests
CREATE POLICY "Allow public access to leave_requests"
  ON leave_requests FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for sickness_records
CREATE POLICY "Allow public access to sickness_records"
  ON sickness_records FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for schedules
CREATE POLICY "Allow public access to schedules"
  ON schedules FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for schedule_assignments
CREATE POLICY "Allow public access to schedule_assignments"
  ON schedule_assignments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_sites_updated_at BEFORE UPDATE ON work_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_assignments_updated_at BEFORE UPDATE ON site_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sickness_records_updated_at BEFORE UPDATE ON sickness_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_assignments_updated_at BEFORE UPDATE ON schedule_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();