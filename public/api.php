<?php
/**
 * ==============================================================================
 * Ethiopian Roads Administration - Native PHP REST API Bridge for cPanel MySQL
 * Designed for Ethio Telecom Web Hosting (LAMP / cPanel / Apache / PHP 7.4 - 8.x)
 * ==============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Load Configuration
$configPath = __DIR__ . '/db_config.php';
$sampleConfigPath = __DIR__ . '/db_config.sample.php';

if (file_exists($configPath)) {
    $dbConfig = require $configPath;
} elseif (file_exists($sampleConfigPath)) {
    $dbConfig = require $sampleConfigPath;
} else {
    $dbConfig = [
        'host'     => getenv('MYSQL_HOST') ?: 'localhost',
        'port'     => getenv('MYSQL_PORT') ?: 3306,
        'database' => getenv('MYSQL_DATABASE') ?: 'era_dashboard',
        'username' => getenv('MYSQL_USER') ?: 'root',
        'password' => getenv('MYSQL_PASSWORD') ?: '',
        'charset'  => 'utf8mb4',
        'timezone' => '+03:00'
    ];
}

// 2. Establish PDO MySQL Connection
$pdo = null;
$dbError = null;

try {
    if (!empty($dbConfig['socket'])) {
        $dsn = "mysql:unix_socket={$dbConfig['socket']};dbname={$dbConfig['database']};charset={$dbConfig['charset']}";
    } else {
        $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['database']};charset={$dbConfig['charset']}";
    }
    
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '{$dbConfig['timezone']}'"
    ];

    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $options);
} catch (PDOException $e) {
    $dbError = $e->getMessage();
}

// Fallback JSON file storage if MySQL is not yet configured or created
$fallbackJsonFile = __DIR__ . '/era_database.json';
function loadJsonStore($file) {
    if (file_exists($file)) {
        $raw = file_get_contents($file);
        $data = json_decode($raw, true);
        if (is_array($data)) return $data;
    }
    return ['projects' => [], 'deleted_projects' => [], 'users' => [], 'approvals' => [], 'config' => []];
}
function saveJsonStore($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// 3. Resolve Request Endpoint
$endpoint = isset($_GET['endpoint']) ? trim($_GET['endpoint'], '/') : '';
if (empty($endpoint)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $endpoint = trim(preg_replace('#^/api/#', '', $uri), '/');
}
$method = $_SERVER['REQUEST_METHOD'];

// Parse JSON Body
$inputJson = file_get_contents('php://input');
$body = !empty($inputJson) ? json_decode($inputJson, true) : [];

// 4. Route Dispatcher
try {
    // GET /api/health or /api/mysql/status
    if ($endpoint === 'health' || $endpoint === 'mysql/status') {
        $isConnected = ($pdo !== null);
        $projectCount = 0;
        $userCount = 0;
        
        if ($isConnected) {
            try {
                $stmt = $pdo->query("SELECT COUNT(*) as c FROM projects");
                $projectCount = (int)$stmt->fetch()['c'];
                $stmt = $pdo->query("SELECT COUNT(*) as c FROM users");
                $userCount = (int)$stmt->fetch()['c'];
            } catch (Exception $e) {}
        }

        echo json_encode([
            'status'          => 'ok',
            'database'        => $isConnected ? 'mysql' : 'fallback_json',
            'mysqlConnected'  => $isConnected,
            'mysqlError'      => $dbError,
            'serverHost'      => $dbConfig['host'],
            'databaseName'    => $dbConfig['database'],
            'serverProvider'  => 'Ethio Telecom Traditional MySQL Web Hosting',
            'stats' => [
                'projectCount' => $projectCount,
                'userCount'    => $userCount
            ],
            'timestamp'       => date('c')
        ]);
        exit;
    }

    // GET /api/projects
    if ($endpoint === 'projects' && $method === 'GET') {
        if ($pdo) {
            $stmt = $pdo->query("SELECT data FROM projects ORDER BY updated_at DESC");
            $projects = [];
            while ($row = $stmt->fetch()) {
                $p = json_decode($row['data'], true);
                if ($p) $projects[] = $p;
            }
            $delStmt = $pdo->query("SELECT id FROM deleted_projects");
            $deletedIds = $delStmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['projects' => $projects, 'deletedIds' => $deletedIds]);
        } else {
            $store = loadJsonStore($fallbackJsonFile);
            echo json_encode([
                'projects' => array_values($store['projects'] ?? []),
                'deletedIds' => array_keys($store['deleted_projects'] ?? [])
            ]);
        }
        exit;
    }

    // POST /api/projects/sync
    if ($endpoint === 'projects/sync' && $method === 'POST') {
        $project = $body['project'] ?? null;
        if (!$project || empty($project['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid project payload']);
            exit;
        }

        if ($pdo) {
            $projJson = json_encode($project, JSON_UNESCAPED_UNICODE);
            $stmt = $pdo->prepare("
                INSERT INTO projects (id, name, program_directorate, pmo, contractor, consultant, physical_progress, financial_progress, total_budget, disbursed_amount, status, last_modified_section, last_modified_at, data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    program_directorate = VALUES(program_directorate),
                    pmo = VALUES(pmo),
                    contractor = VALUES(contractor),
                    consultant = VALUES(consultant),
                    physical_progress = VALUES(physical_progress),
                    financial_progress = VALUES(financial_progress),
                    total_budget = VALUES(total_budget),
                    disbursed_amount = VALUES(disbursed_amount),
                    status = VALUES(status),
                    last_modified_section = VALUES(last_modified_section),
                    last_modified_at = VALUES(last_modified_at),
                    data = VALUES(data)
            ");
            $stmt->execute([
                $project['id'],
                $project['name'] ?? 'Untitled Project',
                $project['programDirectorate'] ?? null,
                $project['pmo'] ?? null,
                $project['contractor'] ?? null,
                $project['consultant'] ?? null,
                $project['physicalProgress'] ?? 0.00,
                $project['financialProgress'] ?? 0.00,
                $project['financial']['totalBudget'] ?? 0.00,
                $project['financial']['disbursedAmount'] ?? 0.00,
                $project['status'] ?? 'Active',
                $project['lastModifiedSection'] ?? 'General',
                $project['lastModifiedAt'] ?? date('c'),
                $projJson
            ]);
        } else {
            $store = loadJsonStore($fallbackJsonFile);
            $store['projects'][$project['id']] = $project;
            saveJsonStore($fallbackJsonFile, $store);
        }

        echo json_encode(['success' => true, 'id' => $project['id']]);
        exit;
    }

    // DELETE /api/projects/:id
    if (preg_match('#^projects/([^/]+)$#', $endpoint, $matches) && $method === 'DELETE') {
        $projId = $matches[1];
        $deletedBy = $body['deletedBy'] ?? 'system';
        $projectName = $body['projectName'] ?? $projId;

        if ($pdo) {
            $delStmt = $pdo->prepare("
                INSERT INTO deleted_projects (id, project_name, deleted_by, deleted_at)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE deleted_at = VALUES(deleted_at)
            ");
            $delStmt->execute([$projId, $projectName, $deletedBy, date('c')]);
            $pdo->prepare("DELETE FROM projects WHERE id = ?")->execute([$projId]);
        } else {
            $store = loadJsonStore($fallbackJsonFile);
            unset($store['projects'][$projId]);
            $store['deleted_projects'][$projId] = ['id' => $projId, 'deleted_at' => date('c')];
            saveJsonStore($fallbackJsonFile, $store);
        }

        echo json_encode(['success' => true, 'id' => $projId]);
        exit;
    }

    // GET /api/users
    if ($endpoint === 'users' && $method === 'GET') {
        if ($pdo) {
            $stmt = $pdo->query("SELECT data FROM users");
            $users = [];
            while ($row = $stmt->fetch()) {
                $u = json_decode($row['data'], true);
                if ($u) $users[] = $u;
            }
            echo json_encode(['users' => $users]);
        } else {
            $store = loadJsonStore($fallbackJsonFile);
            echo json_encode(['users' => array_values($store['users'] ?? [])]);
        }
        exit;
    }

    // POST /api/users/sync
    if ($endpoint === 'users/sync' && $method === 'POST') {
        $users = $body['users'] ?? ($body['user'] ? [$body['user']] : []);
        if ($pdo) {
            $stmt = $pdo->prepare("
                INSERT INTO users (username, full_name, password, role, email, data)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    password = VALUES(password),
                    role = VALUES(role),
                    email = VALUES(email),
                    data = VALUES(data)
            ");
            foreach ($users as $u) {
                if (empty($u['username'])) continue;
                $stmt->execute([
                    strtolower($u['username']),
                    $u['fullName'] ?? $u['username'],
                    $u['password'] ?? '',
                    $u['role'] ?? 'viewer',
                    $u['email'] ?? '',
                    json_encode($u, JSON_UNESCAPED_UNICODE)
                ]);
            }
        }
        echo json_encode(['success' => true, 'count' => count($users)]);
        exit;
    }

    // Default 404
    http_response_code(404);
    echo json_encode(['error' => "Endpoint not found: {$endpoint}"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
