-- Cameras Table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    rtsp_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'offline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Embeddings Table (Kept separate from biometric device templates)
CREATE TABLE tenant_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL, -- References existing tenants table
    embedding JSONB NOT NULL, -- Face vector representation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FaceEvents Table
CREATE TABLE face_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID REFERENCES cameras(id),
    tenant_id UUID, -- Nullable, references existing tenants table
    event_type VARCHAR(50) NOT NULL, -- 'KNOWN', 'UNKNOWN', 'RENT_EXPIRED'
    confidence FLOAT,
    face_image VARCHAR(500), -- Relative path on AI server (e.g. uploads/unknown/...)
    frame_image VARCHAR(500), -- Relative path on AI server
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UnknownVisitors Table
CREATE TABLE unknown_visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES face_events(id),
    remarks TEXT,
    review_status VARCHAR(50) DEFAULT 'PENDING' -- 'PENDING', 'REVIEWED'
);
