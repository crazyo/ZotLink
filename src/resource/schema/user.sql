-- creates tables containing user-created data
-- is called for new database
-- changes made here should be reflected in a new migration script


CREATE TABLE system (
    key             TEXT  NOT NULL  UNIQUE  PRIMARY KEY,
    value           TEXT  NOT NULL
);

CREATE TABLE links (
    id             INTEGER  PRIMARY KEY  AUTOINCREMENT,
    entry1id       INT      NOT NULL,
    entry2id       INT      NOT NULL,
    type           TEXT     NOT NULL,

    UNIQUE (entry1id, entry2id, type)
);

CREATE TABLE linkFields (
    linkid              INT   NOT NULL  UNIQUE  PRIMARY KEY,
    fieldids            BLOB  NOT NULL,

    FOREIGN KEY (linkid) REFERENCES links(id)
);
