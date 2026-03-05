-- Expand sms_notification_queue to allow general notification types
ALTER TABLE sms_notification_queue DROP CONSTRAINT IF EXISTS sms_notification_queue_notification_type_check;
ALTER TABLE sms_notification_queue ADD CONSTRAINT sms_notification_queue_notification_type_check 
  CHECK (notification_type = ANY (ARRAY['withdrawal_approved','withdrawal_rejected','withdrawal_admin_approved','withdrawal_submitted','salary_update','general']::text[]));

-- Now insert the salary update messages
INSERT INTO sms_notification_queue (recipient_phone, recipient_email, message, notification_type) VALUES
('0779370420', 'bwambaledenis@greatpearlcoffee.com', 'Dear Bwambale Denis, your monthly salary has been revised to UGX 500,000 effective this month. Thank you - Great Pearl Coffee.', 'salary_update'),
('0760587186', 'godwinmukobi@greatpearlcoffee.com', 'Dear Mukobi Godwin, your monthly salary has been revised to UGX 400,000 effective this month. Thank you - Great Pearl Coffee.', 'salary_update'),
('0783783187', 'musemawyclif@greatpearlcoffee.com', 'Dear Musema Wyclif, your monthly salary has been revised to UGX 450,000 effective this month. Thank you - Great Pearl Coffee.', 'salary_update'),
('+256773318456', 'tatwanzire@greatpearlcoffee.com', 'Dear Artwanzire Timothy, your monthly salary has been revised to UGX 350,000 effective this month. Thank you - Great Pearl Coffee.', 'salary_update'),
('+256760698680', 'bwambalemorjalia@greatpearlcoffee.com', 'Dear Morjalia Jadens, your monthly salary has been revised to UGX 300,000 effective this month. Thank you - Great Pearl Coffee.', 'salary_update');