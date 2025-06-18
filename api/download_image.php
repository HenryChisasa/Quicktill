<?php
header('Content-Type: application/json');

if (!isset($_POST['imageUrl'])) {
    echo json_encode(['success' => false, 'error' => 'No image URL provided']);
    exit;
}

$imageUrl = $_POST['imageUrl'];

// Download the image
$imageData = @file_get_contents($imageUrl);
if ($imageData === false) {
    echo json_encode(['success' => false, 'error' => 'Failed to download image']);
    exit;
}

// Convert to base64
$base64Image = base64_encode($imageData);
$mimeType = getimagesizefromstring($imageData)['mime'];
$base64Data = "data:{$mimeType};base64,{$base64Image}";

echo json_encode([
    'success' => true,
    'data' => $base64Data
]); 