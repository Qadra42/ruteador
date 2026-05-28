-- Database Schema for Multi-tenant Route Agent
-- Using raw SQL with Postgres

-- Companies (Tenants)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp_number TEXT UNIQUE NOT NULL,
  business_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (Business Owners, Drivers)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Configurations
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id),
  language TEXT NOT NULL DEFAULT 'es-UY',
  business_description TEXT NOT NULL,
  service_area TEXT NOT NULL,
  greeting_message TEXT,
  required_fields JSONB NOT NULL DEFAULT '["what", "where", "when"]',
  custom_instructions TEXT,
  custom_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  items TEXT NOT NULL,
  address TEXT NOT NULL,
  location JSONB,
  preferred_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMP,
  route_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  driver_count TEXT NOT NULL,
  order_ids JSONB NOT NULL,
  optimized_sequence JSONB NOT NULL,
  total_distance TEXT,
  estimated_duration TEXT,
  map_url TEXT,
  google_maps_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_routes_company_id ON routes(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_whatsapp ON companies(whatsapp_number);
