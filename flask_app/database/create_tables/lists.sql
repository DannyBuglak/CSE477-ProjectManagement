-- Store the lists of each board
CREATE TABLE IF NOT EXISTS `lists` (
`list_id`       int(11)         NOT NULL auto_increment         COMMENT 'The id of the list',
`board_id`      int(11)         NOT NULL                        COMMENT 'The board that this list is associated with',
`list_name`     varchar(255)    NOT NULL                        COMMENT 'Name of the list',
PRIMARY KEY (`list_id`),
FOREIGN KEY (board_id) REFERENCES boards(board_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Lists of the boards";