// Initialize a stack to track navigation history for directory browsing
const historyStack = [];

// Main function to handle directory selection
async function selectDirectory() {
    try {
        const directoryHandle = await window.showDirectoryPicker();
        historyStack.length = 0; // Reset history when selecting a new directory
        historyStack.push(directoryHandle);
        await displayFolderContents(directoryHandle);
    } catch (error) {
        console.error('Error selecting directory:', error);
        showError('Failed to select directory. Please try again.');
    }
}

// Display contents of the selected folder
async function displayFolderContents(folderHandle) {
    const fileList = document.getElementById('files-container');
    const imageDisplay = document.getElementById('image-display');
    
    if (!fileList || !imageDisplay) {
        showError('Required elements not found. Please refresh the page.');
        return;
    }

    clearElement(fileList);
    clearElement(imageDisplay);

    if (historyStack.length > 1) {
        addGoBackOption(fileList);
    }

    try {
        for await (const entry of folderHandle.values()) {
            const itemElement = document.createElement('div');
            itemElement.className = entry.kind === 'directory' ? 'folder' : 'file';
            itemElement.textContent = entry.name;

            if (entry.kind === 'directory') {
                itemElement.onclick = async () => {
                    historyStack.push(entry);
                    await displayFolderContents(entry);
                };
            } else if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.zip')) {
                itemElement.onclick = () => displayZipContents(entry);
            }

            fileList.appendChild(itemElement);
        }
    } catch (error) {
        console.error('Error displaying folder contents:', error);
        showError('Failed to display folder contents. Please try again.');
    }
}

// Helper function to add a "Go Back" option in the file list
function addGoBackOption(parent) {
    const goBackElement = document.createElement('div');
    goBackElement.className = 'folder';
    goBackElement.textContent = '.. (Go Back)';
    goBackElement.onclick = () => {
        if (historyStack.length > 1) {
            historyStack.pop();
            displayFolderContents(historyStack[historyStack.length - 1]);
        }
    };
    parent.appendChild(goBackElement);
}

// Utility function to safely clear an element's contents
function clearElement(element) {
    if (element) {
        element.innerHTML = '';
    }
}

// Create or get the loader element
function getLoader() {
    let loader = document.getElementById('loader');
    
    if (!loader) {
        // If loader doesn't exist, create it
        loader = document.createElement('div');
        loader.id = 'loader';
        loader.style.display = 'none';
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-live', 'polite');
        loader.textContent = 'Loading...';
        
        const imageDisplay = document.getElementById('image-display');
        if (imageDisplay) {
            imageDisplay.insertBefore(loader, imageDisplay.firstChild);
        }
    }
    
    return loader;
}

// Display contents of a ZIP file
async function displayZipContents(fileHandle) {
    const loader = getLoader();
    if (!loader) {
        showError('Unable to initialize loader. Please refresh the page.');
        return;
    }

    loader.style.display = 'block';
    
    try {
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const imageDisplay = document.getElementById('image-display');
        
        if (!imageDisplay) {
            throw new Error('Image display element not found');
        }
        
        clearElement(imageDisplay);

        // Filter and sort image files from the ZIP
        const imageFiles = Object.entries(zip.files)
            .filter(([relativePath, zipEntry]) => 
                !zipEntry.dir && /\.(jpg|jpeg|png|gif)$/i.test(relativePath))
            .sort(([pathA], [pathB]) => naturalSort(pathA, pathB));

        for (const [relativePath, zipEntry] of imageFiles) {
            try {
                const blob = await zipEntry.async('blob');
                const imageUrl = URL.createObjectURL(blob);

                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';

                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.loading = 'lazy'; // Enable lazy loading for better performance

                const captionElement = document.createElement('div');
                captionElement.className = 'image-caption';
                captionElement.textContent = relativePath;

                imageItem.appendChild(imgElement);
                imageItem.appendChild(captionElement);
                imageDisplay.appendChild(imageItem);

                // Clean up the object URL after the image loads
                imgElement.onload = () => URL.revokeObjectURL(imageUrl);
            } catch (error) {
                console.error(`Error processing image ${relativePath}:`, error);
                // Continue with other images if one fails
            }
        }
    } catch (error) {
        console.error('Error displaying ZIP contents:', error);
        showError('Failed to display ZIP contents. Please try again.');
    } finally {
        loader.style.display = 'none';
    }
}

// Natural sort function for file names
function naturalSort(a, b) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return collator.compare(a, b);
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const searchBox = document.getElementById('search-box');

    if (themeToggle && body) {
        // Set up theme toggle functionality
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isDarkMode = body.classList.contains('dark-mode');
            themeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
            localStorage.setItem('darkMode', isDarkMode);
        });

        // Restore theme preference
        if (localStorage.getItem('darkMode') === 'true') {
            body.classList.add('dark-mode');
            themeToggle.textContent = 'Light Mode';
        }
    }

    if (searchBox) {
        // Set up search functionality with debouncing
        searchBox.addEventListener('input', debounce((e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('#files-container .file, #files-container .folder');
            items.forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
            });
        }, 300));
    }
});

// Display error messages to the user
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = message;
        
        // Hide error message after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        console.error('Error:', message);
    }
}

// Debounce utility function to limit the rate of function calls
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}