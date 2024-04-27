CREATE TABLE IF NOT EXISTS `boards` (
`board_id`          int(11)         NOT NULL auto_increment     COMMENT 'The id of this board',
`project_name`      varchar(255)    NOT NULL                    COMMENT 'The name of this boards project',
`created_by`        int(11)         NOT NULL                    COMMENT 'Stores what user id created this board',
PRIMARY KEY (`board_id`),
FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Boards on the website";