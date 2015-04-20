-- DROP TABLE IF EXISTS documents; 
-- CREATE TABLE documents(
-- 	id INTEGER PRIMARY KEY AUTOINCREMENT, 
-- 	title TEXT, author_id INTEGER, 
-- 	content TEXT, image TEXT, tags TEXT,
-- 	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
-- 	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TRIGGER documentTime_update BEFORE UPDATE ON documents BEGIN
--   UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = new.id;
-- END;

-- DROP TABLE IF EXISTS users; 
-- CREATE TABLE users(
-- 	id INTEGER PRIMARY KEY AUTOINCREMENT, 
-- 	name TEXT,
-- 	location TEXT,
-- 	pitch TEXT,
-- 	email_address TEXT
-- );

-- DROP TABLE IF EXISTS contribution; 
-- CREATE TABLE contribution(
-- 	id INTEGER PRIMARY KEY AUTOINCREMENT,
-- 	document_id INTEGER,
-- 	user_id INTEGER,
-- 	edit_summary TEXT
-- 	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
-- 	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TRIGGER contibutionTime_update BEFORE UPDATE ON contribution BEGIN
--   UPDATE contribution SET updated_at = CURRENT_TIMESTAMP WHERE id = new.id;
-- END;


-- DROP TABLE IF EXISTS subscription; 
-- CREATE TABLE subscription(
-- 	id INTEGER PRIMARY KEY AUTOINCREMENT,
-- 	document_id INTEGER,
-- 	user_id INTEGER,
-- 	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
-- 	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TRIGGER subsctiptionTime_update BEFORE UPDATE ON subscription BEGIN
--   UPDATE subscription SET updated_at = CURRENT_TIMESTAMP WHERE id = new.id;
-- END;

DROP TABLE IF EXISTS talk; 
CREATE TABLE talk(
talk_id INTEGER PRIMARY KEY AUTOINCREMENT,
document_id INTEGER,
user_id INTEGER,
note TEXT,
parent_id INTEGER, 
childen [],
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER talkTime_update BEFORE UPDATE ON talk BEGIN
UPDATE talk SET updated_at = CURRENT_TIMESTAMP WHERE id = new.id;
END;

-- DROP TABLE IF EXISTS activity; 
-- CREATE TABLE activity(
-- 	id INTEGER PRIMARY KEY AUTOINCREMENT,
-- 	document_id INTEGER,
-- 	user_id INTEGER,
-- 	event TEXT, 
-- 	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
-- 	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE TRIGGER recent_update BEFORE UPDATE ON activity BEGIN
-- UPDATE activity SET updated_at = CURRENT_TIMESTAMP WHERE id = new.id;
-- END;

