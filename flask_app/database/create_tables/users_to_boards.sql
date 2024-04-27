-- A many-to-many implementation of users to boards
CREATE TABLE IF NOT EXISTS `users_to_boards` (
`user_id`       int(11)         NOT NULL            COMMENT 'The user id',
`board_id`      int(11)         NOT NULL            COMMENT 'The board id for the user id',
PRIMARY KEY (`user_id`, `board_id`),
FOREIGN KEY (user_id) REFERENCES users(user_id),
FOREIGN KEY (board_id) REFERENCES boards(board_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="A many-to-many implementation of users to boards";