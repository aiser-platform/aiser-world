-- Fix user passwords by updating them with proper pbkdf2_sha256 hashes
-- This script updates the existing users with properly hashed passwords

-- Update admin user password
UPDATE users 
SET password = 'pbkdf2:sha256:600000$2b3a80098ccc03bfaec22d94689853b3$6b83f047da711e07bea08184fb2e87bc801e1c4bbbf612c4b52af441d2f90853'
WHERE username = 'admin123';

-- Update user123 password  
UPDATE users 
SET password = 'pbkdf2:sha256:600000$1114ba46dbdec286b255a835d83f8b04$8b8aa8e825ae5cff16250dccf7de851bb161dd0fb31cccb7d5f718db7ef05d5d'
WHERE username = 'user123';

-- Update analyst123 password
UPDATE users 
SET password = 'pbkdf2:sha256:600000$bf55c89bea9b5a1211971334ac4d120b$c05c07da52469aaa21c1477dc2cf755924eef27e60580f62ae20e88681df487b'
WHERE username = 'analyst123';

-- Update test123456 password
UPDATE users 
SET password = 'pbkdf2:sha256:600000$f1326e708f752682af55783582b000d3$1b7e8f7825c2bf044698db9ce095d630a359ecfece8244dbba060e53aa20a5e1'
WHERE username = 'test123456';

-- Also update any other users with the default password hash
UPDATE users 
SET password = 'pbkdf2:sha256:600000$2b3a80098ccc03bfaec22d94689853b3$6b83f047da711e07bea08184fb2e87bc801e1c4bbbf612c4b52af441d2f90853'
WHERE password = 'temp_password_change_me';

-- Verify the updates
SELECT username, 
       CASE 
           WHEN password LIKE 'pbkdf2:sha256:%' THEN 'VALID_HASH'
           ELSE 'INVALID_HASH'
       END as hash_status,
       LENGTH(password) as hash_length
FROM users;

-- Commit the changes
COMMIT;
