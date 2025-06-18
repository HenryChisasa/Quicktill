// Image Search Functionality
$(document).ready(function() {
    // Open image search modal
    $('#searchImageBtn').click(function() {
        $('#imageSearchModal').modal('show');
    });

    // Perform image search
    $('#performImageSearch').click(function() {
        const query = $('#imageSearchQuery').val();
        if (!query) {
            alert('Please enter a search term');
            return;
        }

        $('#imageSearchLoading').show();
        $('#imageSearchResults').empty();

        // Make API call to your backend endpoint
        $.ajax({
            url: 'api/search_image.php',
            method: 'POST',
            data: { query: query },
            success: function(response) {
                $('#imageSearchLoading').hide();
                if (response.items && response.items.length > 0) {
                    response.items.forEach(function(item) {
                        const imageHtml = `
                            <div class="col-md-4" style="margin-bottom: 20px;">
                                <div class="thumbnail">
                                    <img src="${item.link}" alt="${item.title}" style="width: 100%; height: 200px; object-fit: cover;">
                                    <div class="caption">
                                        <p>${item.title}</p>
                                        <button class="btn btn-primary btn-sm select-image" 
                                                data-image-url="${item.link}">
                                            Select
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                        $('#imageSearchResults').append(imageHtml);
                    });
                } else {
                    $('#imageSearchResults').html('<div class="col-12"><p>No images found</p></div>');
                }
            },
            error: function() {
                $('#imageSearchLoading').hide();
                $('#imageSearchResults').html('<div class="col-12"><p>Error searching for images</p></div>');
            }
        });
    });

    // Handle image selection
    $(document).on('click', '.select-image', function() {
        const imageUrl = $(this).data('image-url');
        
        // Download the image and convert to base64
        $.ajax({
            url: 'api/download_image.php',
            method: 'POST',
            data: { imageUrl: imageUrl },
            success: function(response) {
                if (response.success) {
                    // Update the current image preview
                    $('#current_img').html(`
                        <img src="${response.data}" style="max-width: 200px; max-height: 200px;">
                    `);
                    
                    // Store the base64 image data in a hidden input
                    if (!$('#imageData').length) {
                        $('<input>').attr({
                            type: 'hidden',
                            id: 'imageData',
                            name: 'imageData'
                        }).val(response.data).appendTo('#productForm');
                    } else {
                        $('#imageData').val(response.data);
                    }
                    
                    // Close the modal
                    $('#imageSearchModal').modal('hide');
                } else {
                    alert('Error downloading image');
                }
            },
            error: function() {
                alert('Error downloading image');
            }
        });
    });
});

// Handle template download
$(document).on('click', '#downloadTemplate', function() {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = 'sample_products/products_template.csv';
    link.download = 'products_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}); 