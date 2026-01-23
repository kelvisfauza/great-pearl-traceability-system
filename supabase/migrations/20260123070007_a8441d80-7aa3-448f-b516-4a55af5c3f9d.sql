-- Enable realtime for system_console_logs and system_errors tables
ALTER PUBLICATION supabase_realtime ADD TABLE system_console_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE system_errors;