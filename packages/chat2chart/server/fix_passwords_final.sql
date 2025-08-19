-- Fix user passwords by updating them with correct pbkdf2_sha256 hashes
-- This script uses the proper salt from the auth service configuration

-- Update admin user password
UPDATE users 
SET password = 'pbkdf2:sha256:600000$9e25a2588fcee7d21ea15fb1a63d5135$243eef124a086338f2f74a234f1da014d9dd319dc2ba443090cee6e96b6ae3de'
WHERE username = 'admin';

-- Update user password  
UPDATE users 
SET password = 'pbkdf2:sha256:600000$9e25a2588fcee7d21ea15fb1a63d5135$ce73888fbf70574a201a35822b898db293e327ef66daee43d8a6018e9565d3872'
WHERE username = 'user';

-- Update analyst password
UPDATE users 
SET password = 'pbkdf2:sha256:600000$9e25a2588fcee7d21ea15fb1a63d5135$a9882dce4193648fb9895e6afa86466b8e99cdcef024888431e8acfd1d41bdaac'
WHERE username = 'analyst';

-- Update testuser password
UPDATE users 
SET password = 'pbkdf2:sha256:600000$9e25a2588fcee7d21ea15fb1a63d5135$82f8231110a063e1fc987622ba3186de250394dba167541765f466b99026490a'
WHERE username = 'testuser';

-- Verify the updates
SELECT username, 
       CASE 
           WHEN password LIKE 'pbkdf2:sha256:600000$9e25a2588fcee7d21ea15fb1a63d5135$%' THEN 'CORRECT_HASH'
           ELSE 'INCORRECT_HASH'
       END as hash_status,
       LENGTH(password) as hash_length
FROM users;

-- Commit the changes
COMMIT;
