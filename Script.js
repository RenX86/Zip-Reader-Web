let historyStack = []; // Stack to keep track of directory navigation

async function selectDirectory() {
    try {
        const directoryHandle = await window.showDirectoryPicker();
        historyStack = [];  // Clear history when a new directory is selected
        historyStack.push(directoryHandle); // Push the initial directory to the stack
        await displayFolderContents(directoryHandle);
    } catch (error) {
        console.error('Error selecting directory:', error);
        alert('Failed to select directory. Please try again.');
    }
}

async function displayFolderContents(folderHandle) {
    const fileList = document.getElementById('file-list');
    const imageDisplay = document.getElementById('image-display');
    fileList.innerHTML = '';  
    imageDisplay.innerHTML = '';

    if (historyStack.length > 1) {
        const goBackElement = document.createElement('div');
        goBackElement.className = 'folder';
        goBackElement.textContent = '.. (Go Back)';
        goBackElement.onclick = () => goBack();
        fileList.appendChild(goBackElement);
    }

    try {
        for await (const entry of folderHandle.values()) {
            const itemElement = document.createElement('div');
            itemElement.className = entry.kind === 'directory' ? 'folder' : 'file';
            itemElement.textContent = entry.name;

            if (entry.kind === 'directory') {
                itemElement.onclick = () => {
                    historyStack.push(entry);
                    displayFolderContents(entry);
                };
            } else if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.zip')) {
                itemElement.onclick = () => displayZipContents(entry);
            }

            fileList.appendChild(itemElement);
        }
    } catch (error) {
        console.error('Error displaying folder contents:', error);
        alert('Failed to display folder contents. Please try again.');
    }
}

function naturalSort(a, b) {
    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
    return collator.compare(a, b);
}

async function displayZipContents(fileHandle) {
    try {
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const imageDisplay = document.getElementById('image-display');
        imageDisplay.innerHTML = '';

        const imageFiles = Object.entries(zip.files)
            .filter(([relativePath, zipEntry]) => 
                !zipEntry.dir && /\.(jpg|jpeg|png|gif)$/i.test(relativePath))
            .sort(([pathA], [pathB]) => naturalSort(pathA, pathB));

        for (const [relativePath, zipEntry] of imageFiles) {
            const blob = await zipEntry.async('blob');
            const imageUrl = URL.createObjectURL(blob);

            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';

            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;

            const captionElement = document.createElement('div');
            captionElement.className = 'image-caption';
            captionElement.textContent = relativePath;

            imageItem.appendChild(imgElement);
            imageItem.appendChild(captionElement);
            imageDisplay.appendChild(imageItem);
        }
    } catch (error) {
        console.error('Error displaying ZIP contents:', error);
        alert('Failed to display ZIP contents. Please try again.');
    }
}

function goBack() {
    if (historyStack.length > 1) {
        historyStack.pop();
        const parentFolder = historyStack[historyStack.length - 1];
        displayFolderContents(parentFolder);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
        
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        themeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';

        // Optional: Save the user's preference
        localStorage.setItem('darkMode', isDarkMode);
    });
    // Optional: Load the user's preference
    if (localStorage.getItem('darkMode') === 'true') {
        body.classList.add('dark-mode');
        themeToggle.textContent = 'Light Mode';
    }
});   