<?php
header('Content-Type: application/json');

// Google Custom Search API configuration
$apiKey = 'YOUR_GOOGLE_API_KEY'; // Replace with your API key from Google Cloud Console
$searchEngineId = 'YOUR_SEARCH_ENGINE_ID'; // Replace with your Search Engine ID from Programmable Search Engine

// Validate configuration
if ($apiKey === 'YOUR_GOOGLE_API_KEY' || $searchEngineId === 'YOUR_SEARCH_ENGINE_ID') {
    echo json_encode([
        'error' => 'API configuration not set. Please update api/search_image.php with your Google API credentials.'
    ]);
    exit;
}

if (!isset($_POST['query'])) {
    echo json_encode(['error' => 'No search query provided']);
    exit;
}

$query = urlencode($_POST['query']);
$url = "https://www.googleapis.com/customsearch/v1?key={$apiKey}&cx={$searchEngineId}&q={$query}&searchType=image&num=9";

// Add error handling for the API request
$context = stream_context_create([
    'http' => [
        'ignore_errors' => true
    ]
]);

$response = file_get_contents($url, false, $context);
if ($response === false) {
    echo json_encode(['error' => 'Failed to fetch search results']);
    exit;
}

// Check for HTTP errors
$httpCode = $http_response_header[0];
if (strpos($httpCode, '200') === false) {
    $error = json_decode($response, true);
    echo json_encode([
        'error' => 'API Error: ' . ($error['error']['message'] ?? 'Unknown error')
    ]);
    exit;
}

echo $response; 