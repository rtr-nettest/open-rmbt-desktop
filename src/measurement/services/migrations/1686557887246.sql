CREATE TABLE IF NOT EXISTS measurements (
    "client_name" varchar,
    "client_version" varchar,
    "client_uuid" varchar NOT NULL,
    "cpu" text,
    "network_type" integer,
    "operating_system" varchar,
    "pings" text,
    "platform" varchar,
    "speed_detail" text,
    "test_bytes_download" integer NOT NULL,
    "test_bytes_upload" integer NOT NULL,
    "test_nsec_download" integer NOT NULL,
    "test_nsec_upload" integer NOT NULL,
    "test_num_threads" integer NOT NULL,
    "test_ping_shortest" integer NOT NULL,
    "test_speed_download" integer NOT NULL,
    "test_speed_upload" integer NOT NULL,
    "test_status" integer,
    "test_token" varchar NOT NULL,
    "test_uuid" varchar NOT NULL,
    "time" integer NOT NULL,
    "timezone" varchar,
    "type" varchar,
    "user_server_selection" integer,
    "measurement_server" varchar,
    "provider_name" varchar,
    "ip_address" varchar
)
