-- Fix user passwords by updating them with standard passlib hashes
-- These hashes use random salts and will work correctly with passlib.verify()

-- Update admin user password
UPDATE users 
SET password = '$pbkdf2-sha256$29000$V6o1ZgzhvLcWAsBYyxnjXA$I/X.B1tVAqgxVOweeowYKlpLxlKophM2x.7HdI0nMok'
WHERE username = 'admin';

-- Update user password  
UPDATE users 
SET password = '$pbkdf2-sha256$29000$2HsPIaQUolTqnbMWwlgrhQ$H1CtY0K9H7dx6NWOvdLi2kpvJRtZI6C1BgbdpK7XxFk'
WHERE username = 'user';

-- Update analyst password
UPDATE users 
SET password = '$pbkdf2-sha256$29000$VarVmvPeO0cIwbjXmvN.Dw$VTyqu1FnGhN1KJ1qsUkyPtn6/ozcsXwoxQIdIfEvVjg'
WHERE username = 'analyst';

-- Update testuser password
UPDATE users 
SET password = '$pbkdf2-sha256$29000$i5EyRkiplfL.n/N.rzXmfA$amazy/tcPQoFFZ1U.CzBlObjyY2C3LSo2RX2bGrnigI'
WHERE username = 'testuser';

-- Verify the updates
SELECT username, 
       CASE 
           WHEN password LIKE '$pbkdf2-sha256$%' THEN 'STANDARD_PASSLIB_HASH'
           ELSE 'INCORRECT_HASH'
       END as hash_status,
       LENGTH(password) as hash_length
FROM users;

-- Commit the changes
COMMIT;
