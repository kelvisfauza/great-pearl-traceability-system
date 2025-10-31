-- Clean up all pending deletion requests since we removed the approval system
DELETE FROM deletion_requests WHERE status = 'pending';