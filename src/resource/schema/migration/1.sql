-- migration script #1
--


-- new table: system
CREATE TABLE system (
    key             TEXT  NOT NULL  UNIQUE  PRIMARY KEY,
    value           TEXT  NOT NULL
);

-- alter tables: links and linkFields

-- temporarily turn off foreign key constraints
PRAGMA foreign_keys=OFF;

-- migrate data from the old table to the new table
ALTER TABLE links RENAME TO links_old;
CREATE TABLE links (
    id             INTEGER  PRIMARY KEY  AUTOINCREMENT,
    entry1id       INT      NOT NULL,
    entry2id       INT      NOT NULL,
    type           TEXT     NOT NULL,

    UNIQUE (entry1id, entry2id, type)
);
-- old links table contains only item links
INSERT INTO links SELECT *, "item" FROM links_old;
DROP TABLE links_old;

ALTER TABLE linkFields RENAME TO linkFields_old;
CREATE TABLE linkFields (
    linkid              INT   NOT NULL  UNIQUE  PRIMARY KEY,
    fieldids            BLOB  NOT NULL,

    FOREIGN KEY (linkid) REFERENCES links(id)
);
INSERT INTO linkFields SELECT * FROM linkFields_old;
DROP TABLE linkFields_old;

-- turn foreign key constraints back on
PRAGMA foreign_keys=ON;

-- insert db version
INSERT INTO system VALUES ("version", "1");
