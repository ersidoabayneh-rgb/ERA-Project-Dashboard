<?php
/**
 * Ethio Telecom Traditional MySQL Database Configuration
 * Rename or copy this file to `db_config.php` and fill in your cPanel credentials.
 */

return [
    // On traditional Ethio Telecom cPanel web hosting, MySQL runs on localhost
    'host'     => getenv('MYSQL_HOST') ?: 'localhost',
    'port'     => getenv('MYSQL_PORT') ?: 3306,
    // Typically `cpaneluser_eradb` or `eradashb_db`
    'database' => getenv('MYSQL_DATABASE') ?: 'eradashb_db',
    // Typically `cpaneluser_user` or `eradashb_user`
    'username' => getenv('MYSQL_USER') ?: 'eradashb_user',
    'password' => getenv('MYSQL_PASSWORD') ?: '',
    // Optional socket path on Linux cPanel (e.g., /var/lib/mysql/mysql.sock)
    'socket'   => getenv('MYSQL_SOCKET') ?: null,
    'charset'  => 'utf8mb4',
    'timezone' => '+03:00', // East Africa Time (EAT)
];
