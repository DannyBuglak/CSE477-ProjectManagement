-- Store the cards
CREATE TABLE IF NOT EXISTS `cards` (
`card_id`       int(11)         NOT NULL auto_increment         COMMENT 'The id of the card',
`list_id`       int(11)         NOT NULL                        COMMENT 'The list this card is associated with',
`card_title`    varchar(255)    NOT NULL                        COMMENT 'The title of the card',
`card_desc`     varchar(1024)   DEFAULT NULL                    COMMENT 'The description of the card',
PRIMARY KEY (`card_id`),
FOREIGN KEY (list_id) REFERENCES lists(list_id) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Cards on lists";